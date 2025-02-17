// Copyright 2017 TODO Group. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

// eslint-disable-next-line no-unused-vars
const Result = require('../lib/result')
// eslint-disable-next-line no-unused-vars
const FileSystem = require('../lib/file_system')
const simpleGit = require('simple-git')

function getContent(options) {
  return options['human-readable-content'] !== undefined
    ? options['human-readable-content']
    : options.content
}

function getContext(matchedLine, regexMatch, contextLength) {
  const matchStart = regexMatch.index
  const contextStart =
    matchStart - contextLength > 0 ? matchStart - contextLength : 0
  const contextEnd = Math.min(
    regexMatch.index + regexMatch[0].length + contextLength,
    matchedLine.length
  )
  return matchedLine.substring(contextStart, contextEnd)
}

/**
 * Check if a list of files contains a regular expression.
 *
 * @param {FileSystem} fs A filesystem object configured with filter paths and target directories
 * @param {object} options The rule configuration
 * @param {boolean} not Whether or not to invert the result (not contents instead of contents)
 * @param {boolean} any Whether to check if the regular expression is contained by at least one of the files in the list
 * @returns {Promise<Result>} The lint rule result
 * @ignore
 */
async function fileContents(fs, options, not = false, any = false) {
  // support legacy configuration keys
  const fileList = (any ? options.globsAny : options.globsAll) || options.files
  const files = await fs.findAllFiles(fileList, !!options.nocase)
  const regexFlags = options.flags || ''
  const branchOptionEnabled = isBranchOptionEnabled(options)

  if (branchOptionEnabled) {
    return await fileContentsWithBranchOption(fs, options, not, any, undefined)
  }

  if (files.length === 0) {
    return new Result(
      'Did not find file matching the specified patterns',
      fileList.map(f => {
        return { passed: !options['fail-on-non-existent'], pattern: f }
      }),
      !options['fail-on-non-existent']
    )
  }

  const regex = new RegExp(options.content, regexFlags)
  let results

  if (!options['display-result-context']) {
    /**
     * Default "Contains" / "Doesn't contain"
     * @ignore
     */
    results = await Promise.all(
      files.map(async file => {
        const fileContents = await fs.getFileContents(file)
        if (!fileContents) return null

        const passed = fileContents.search(regex) >= 0
        const message = `${
          passed ? 'Contains' : "Doesn't contain"
        } ${getContent(options)}`

        return {
          passed: not ? !passed : passed,
          path: file,
          message
        }
      })
    )
  } else {
    /**
     * Add regular expression matched content context into result.
     * Added contexts includes:
     *  - line # of the regular expression.
     *  - 'options.context-char-length' number of characters before and after the regex match.
     * The added context will be in result.message.
     *
     * Note: if 'g' is not presented in 'options.flags',
     * the regular expression will only display the first match context.
     * @ignore
     */
    results = (
      await Promise.all(
        files.map(async file => {
          const fileContents = await fs.getFileContents(file)
          if (!fileContents) return null

          const optionContextCharLength = options['context-char-length'] || 50
          const split = fileContents.split(regex)
          const regexHasMatch = split.length > 1
          if (!regexHasMatch) {
            return {
              passed: not ? !regexHasMatch : regexHasMatch,
              path: file,
              contextLines: [],
              message: `Doesn't contain '${getContent(options)}'`
            }
          }

          const fileLines = fileContents.split('\n')
          const contextLines = split
            /**
             * @return sum of line numbers in each regexp split chunks.
             * @ignore
             */
            .map(fileChunk => {
              /**
               * Note: Handle *undefined* in regex split result issue
               * by treating *undefined* as ''
               * @ignore
               */
              if (fileChunk !== undefined) return fileChunk.split('\n').length
              return 1
            })
            /**
             * Get lines of regexp match
             * @return list of lines contains regexp matchs
             * @ignore
             */
            .reduce((previous, current, index, array) => {
              /**
               * Push number of lines before the first regex match to the result array.
               * @ignore
               */
              if (previous.length === 0) {
                previous.push(current)
              } else if (current === 1 || index === array.length - 1) {
                /**
                 * We don't need to count multiple times if one line contains multiple regex match.
                 * We don't need to count rest of lines after last regex match.
                 * @ignore
                 */
              } else {
                /**
                 * Add *relative number of lines* between this regex match and last regex match (current-1)
                 * to the last *absolute number of lines* of last regex match to the top of file (previous[lastElement])
                 * to get the *absolute number of lines* of current regex match.
                 * @ignore
                 */
                previous.push(current - 1 + previous[previous.length - 1])
              }
              return previous
            }, [])
            /**
             * @return lines and contexts of every regex matches.
             * @ignore
             */
            .reduce((previous, current) => {
              const matchedLine = fileLines[current - 1]
              /**
               * We can't do multi-line match on a single line context,
               * so we try to detect a match on the line
               * and print helpful info if there is none.
               *
               * Note: multi-line output context can be challenging to read.
               * So instead of print unpredictable context in the output,
               * we just print line number.
               * @ignore
               */
              if (regexFlags.includes('m')) {
                let currentMatch = regex.exec(matchedLine)

                /**
                 * Found no match, the regex match was multi-line.
                 * Print info in context instead of actual context.
                 * @ignore
                 */
                if (currentMatch === null) {
                  previous.push({
                    line: current,
                    context:
                      '-- This is a multi-line regex match so we only displaying line number --'
                  })
                  return previous
                }
                /**
                 * Find a match, so we try to find all matches.
                 * Reset regex.lastIndex to start from beginning.
                 * @ignore
                 */
                regex.lastIndex = 0
                while ((currentMatch = regex.exec(matchedLine)) !== null) {
                  previous.push({
                    line: current,
                    context: getContext(
                      matchedLine,
                      currentMatch,
                      optionContextCharLength
                    )
                  })
                  if (regex.lastIndex === 0) break
                }
                return previous
              }

              /**
               * No *global* flag means regex.lastIndex will not advance.
               * We just need to run regex.exec once
               * @ignore
               */
              if (!regexFlags.includes('g')) {
                const currentMatch = regex.exec(matchedLine)
                /**
                 * Found a match! Put it in the result
                 * @ignore
                 */
                if (currentMatch != null) {
                  previous.push({
                    line: current,
                    context: getContext(
                      matchedLine,
                      currentMatch,
                      optionContextCharLength
                    )
                  })
                  return previous
                }
                /**
                 * User should never reach here, throw an error when that happens.
                 * @ignore
                 */
                console.trace('Error trace:')
                throw new Error(
                  'Please open an issue on https://github.com/todogroup/repolinter'
                )
              }

              /**
               * Find all matches on the string with non-multi-line regex
               * @ignore
               */
              let currentMatch
              while ((currentMatch = regex.exec(matchedLine)) !== null) {
                previous.push({
                  line: current,
                  context: getContext(
                    matchedLine,
                    currentMatch,
                    optionContextCharLength
                  )
                })
              }
              return previous
            }, [])

          return {
            passed: not ? !regexHasMatch : regexHasMatch,
            path: file,
            contextLines,
            message: `Contains '${getContent(options)}'`
          }
        })
      )
    )
      .filter(result => result && (not ? !result.passed : result.passed))
      .reduce((previous, current) => {
        current.contextLines.forEach(lineContext => {
          previous.push({
            passed: current.passed,
            path: current.path,
            message: `${current.message} on line ${lineContext.line}, context: \n\t|${lineContext.context}`
          })
        })
        return previous
      }, [])
  }

  const filteredResults = results.filter(r => r !== null)
  const passed = any
    ? filteredResults.some(r => r.passed)
    : !filteredResults.find(r => !r.passed)
  return new Result('', filteredResults, passed)
}

/**
 * Check if a list of files in one or more branches contains a regular expression.
 *
 * @param {FileSystem} fs A filesystem object configured with filter paths and target directories
 * @param {object} options The rule configuration
 * @param {boolean} not Whether or not to invert the result (not contents instead of contents)
 * @param {boolean} any Whether to check if the regular expression is contained by at least one of the files in the list
 * @param {SimpleGit} git A simple-git object configured correct path
 * @returns {Promise<Result>} The lint rule result
 * @ignore
 */
async function fileContentsWithBranchOption(
  fs,
  options,
  not = false,
  any = false,
  git
) {
  // support legacy configuration keys
  const fileList = (any ? options.globsAny : options.globsAll) || options.files
  const regexFlags = options.flags || ''
  const regex = new RegExp(options.content, regexFlags)

  if (git === undefined) {
    git = simpleGit({
      progress({ method, stage, progress }) {
        console.log(`git.${method} ${stage} stage ${progress}% complete`)
      },
      baseDir: fs.targetDir
    })
  }

  const defaultBranch = (await git.branchLocal()).current
  const branches = options.branches
  if (!options.skipDefaultBranch) {
    branches.unshift(defaultBranch)
  }
  const defaultRemote = (await git.getRemotes())[0]
  await fetchAllBranchesRemote(git, defaultRemote.name)

  let results = []
  let noMatchingFileFoundCount = 0
  let switchedBranch = false
  for (let index = 0; index < branches.length; index++) {
    const branch = branches[index]
    if (
      !(await doesBranchExist(git, branch)) &&
      !(await doesBranchExist(git, `${defaultRemote.name}/${branch}`))
    ) {
      noMatchingFileFoundCount++
      continue
    }
    // if branch name is the default branch from clone, ignore and do not checkout.
    if (branch !== defaultBranch) {
      // perform git checkout of the target branch
      await gitCheckout(git, branch, defaultRemote.name)
      switchedBranch = true
    }
    const files = await fs.findAllFiles(fileList, !!options.nocase)
    if (files.length === 0) {
      noMatchingFileFoundCount++
      continue
    }
    if (!options['display-result-context']) {
      /**
       * Default "Contains" / "Doesn't contain"
       * @ignore
       */
      results = results.concat(
        await Promise.all(
          files.map(async file => {
            const fileContents = await fs.getFileContents(file)
            if (!fileContents) return null

            const passed = fileContents.search(regex) >= 0
            const message = `${
              passed ? 'Contains' : "Doesn't contain"
            } ${getContent(options)}`

            // TODO: Might need to increase noMatchingFileFoundCount here instead of returning if it did not find a file
            return {
              passed: not ? !passed : passed,
              path: file,
              message
            }
          })
        )
      )
    } else {
      /**
       * Add regular expression matched content context into result.
       * Added contexts includes:
       *  - line # of the regular expression.
       *  - 'options.context-char-length' number of characters before and after the regex match.
       * The added context will be in result.message.
       *
       * Note: if 'g' is not presented in 'options.flags',
       * the regular expression will only display the first match context.
       * @ignore
       */
      results = results
        .concat(
          await Promise.all(
            files.map(async file => {
              const fileContents = await fs.getFileContents(file)
              if (!fileContents) return null

              const optionContextCharLength =
                options['context-char-length'] || 50
              const split = fileContents.split(regex)
              const regexHasMatch = split.length > 1
              if (!regexHasMatch) {
                return {
                  passed: not ? !regexHasMatch : regexHasMatch,
                  path: file,
                  contextLines: [],
                  message: `Doesn't contain '${getContent(options)}'`
                }
              }

              const fileLines = fileContents.split('\n')
              const contextLines = split
                /**
                 * @return sum of line numbers in each regexp split chunks.
                 * @ignore
                 */
                .map(fileChunk => {
                  /**
                   * Note: Handle *undefined* in regex split result issue
                   * by treating *undefined* as ''
                   * @ignore
                   */
                  if (fileChunk !== undefined)
                    return fileChunk.split('\n').length
                  return 1
                })
                /**
                 * Get lines of regexp match
                 * @return list of lines contains regexp matchs
                 * @ignore
                 */
                .reduce((previous, current, index, array) => {
                  /**
                   * Push number of lines before the first regex match to the result array.
                   * @ignore
                   */
                  if (previous.length === 0) {
                    previous.push(current)
                  } else if (current === 1 || index === array.length - 1) {
                    /**
                     * We don't need to count multiple times if one line contains multiple regex match.
                     * We don't need to count rest of lines after last regex match.
                     * @ignore
                     */
                  } else {
                    /**
                     * Add *relative number of lines* between this regex match and last regex match (current-1)
                     * to the last *absolute number of lines* of last regex match to the top of file (previous[lastElement])
                     * to get the *absolute number of lines* of current regex match.
                     * @ignore
                     */
                    previous.push(current - 1 + previous[previous.length - 1])
                  }
                  return previous
                }, [])
                /**
                 * @return lines and contexts of every regex matches.
                 * @ignore
                 */
                .reduce((previous, current) => {
                  const matchedLine = fileLines[current - 1]
                  /**
                   * We can't do multi-line match on a single line context,
                   * so we try to detect a match on the line
                   * and print helpful info if there is none.
                   *
                   * Note: multi-line output context can be challenging to read.
                   * So instead of print unpredictable context in the output,
                   * we just print line number.
                   * @ignore
                   */
                  if (regexFlags.includes('m')) {
                    let currentMatch = regex.exec(matchedLine)

                    /**
                     * Found no match, the regex match was multi-line.
                     * Print info in context instead of actual context.
                     * @ignore
                     */
                    if (currentMatch === null) {
                      previous.push({
                        line: current,
                        context:
                          '-- This is a multi-line regex match so we only displaying line number --'
                      })
                      return previous
                    }
                    /**
                     * Find a match, so we try to find all matches.
                     * Reset regex.lastIndex to start from beginning.
                     * @ignore
                     */
                    regex.lastIndex = 0
                    while ((currentMatch = regex.exec(matchedLine)) !== null) {
                      previous.push({
                        line: current,
                        context: getContext(
                          matchedLine,
                          currentMatch,
                          optionContextCharLength
                        )
                      })
                      if (regex.lastIndex === 0) break
                    }
                    return previous
                  }

                  /**
                   * No *global* flag means regex.lastIndex will not advance.
                   * We just need to run regex.exec once
                   * @ignore
                   */
                  if (!regexFlags.includes('g')) {
                    const currentMatch = regex.exec(matchedLine)
                    /**
                     * Found a match! Put it in the result
                     * @ignore
                     */
                    if (currentMatch != null) {
                      previous.push({
                        line: current,
                        context: getContext(
                          matchedLine,
                          currentMatch,
                          optionContextCharLength
                        )
                      })
                      return previous
                    }
                    /**
                     * User should never reach here, throw an error when that happens.
                     * @ignore
                     */
                    console.trace('Error trace:')
                    throw new Error(
                      'Please open an issue on https://github.com/todogroup/repolinter'
                    )
                  }

                  /**
                   * Find all matches on the string with non-multi-line regex
                   * @ignore
                   */
                  let currentMatch
                  while ((currentMatch = regex.exec(matchedLine)) !== null) {
                    previous.push({
                      line: current,
                      context: getContext(
                        matchedLine,
                        currentMatch,
                        optionContextCharLength
                      )
                    })
                  }
                  return previous
                }, [])

              return {
                passed: not ? !regexHasMatch : regexHasMatch,
                path: file,
                contextLines,
                message: `Contains '${getContent(options)}'`
              }
            })
          )
        )
        .filter(result => result && (not ? !result.passed : result.passed))
        .reduce((previous, current) => {
          current.contextLines.forEach(lineContext => {
            previous.push({
              passed: current.passed,
              path: current.path,
              message: `${current.message} on line ${lineContext.line}, context: \n\t|${lineContext.context}`
            })
          })
          return previous
        }, [])
    }
  }
  if (switchedBranch) {
    // Make sure we are back using the default branch
    await gitCheckout(git, defaultBranch, defaultRemote.name)
  }

  if (noMatchingFileFoundCount === branches.length) {
    return new Result(
      'Did not find file matching the specified patterns',
      fileList.map(f => {
        return { passed: false, pattern: f }
      }),
      !options['fail-on-non-existent']
    )
  }

  const filteredResults = results.filter(r => r !== null)
  const passed = any
    ? filteredResults.some(r => r.passed)
    : !filteredResults.find(r => !r.passed)
  return new Result('', filteredResults, passed)
}

module.exports = fileContents

// isBranchesOptionEnabled returns true if the branches option is enabled.
function isBranchOptionEnabled(options) {
  if (
    options.branches !== undefined &&
    options.branches !== null &&
    options.branches !== [] &&
    options.branches.length > 0
  ) {
    return true
  }
  return false
}

// Fetch all remote branches, fetches just the names on remote.
// Needs to be done since we did a shallow checkout
async function fetchAllBranchesRemote(git, defaultRemote) {
  // Since we do a shallow clone, we need to first retrieve the branches
  await git.addConfig(
    `remote.${defaultRemote}.fetch`,
    `+refs/heads/*:refs/remotes/${defaultRemote}/*`
  )
  await git.remote(['update'])
}

// Check if branch exists
async function doesBranchExist(git, branch) {
  const branches = (await git.branch(['-r'])).all
  if (branches.find(v => v === branch)) {
    return true
  }
  return false
}
// Helper method to quickly checkout to a different branch
async function gitCheckout(git, branch, defaultRemote) {
  const checkoutResult = await git.checkout(branch)
  if (checkoutResult) {
    const checkoutResultWithDefaultOrigin = await git.checkout(
      `${defaultRemote}/${branch}`
    )
    if (checkoutResultWithDefaultOrigin) {
      console.error(checkoutResult)
      process.exitCode = 1
      throw new Error(`Failed checking out branch: ${defaultRemote}/${branch}`)
    }
  }
}
