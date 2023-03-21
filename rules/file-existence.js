// Copyright 2017 TODO Group. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const Result = require('../lib/result')
// eslint-disable-next-line no-unused-vars
const FileSystem = require('../lib/file_system')

/**
 * Check if a file is present in the repository. Succeeds on the first file
 * matching the glob pattern, fails if no file matching any of the patterns
 * is found.
 *
 * @param {FileSystem} fs A filesystem object configured with filter paths and target directories
 * @param {object} options The rule configuration
 * @returns {Promise<Result>} The lint rule result
 * @ignore
 */
async function fileExistence(fs, options) {
  const fileList = options.globsAny || options.files || options.directories
  const file = options.dirs
    ? await fs.findFirst(fileList, options.nocase)
    : await fs.findFirstFile(fileList, options.nocase)

  const passed = !!file

  return passed
    ? new Result(
        '',
        [{ passed: true, path: file, message: 'Found file' }],
        true
      )
    : new Result(
        `${
          options['fail-message'] !== undefined
            ? options['fail-message'] + '. '
            : ''
        }Did not find a file matching the specified patterns`,
        fileList.map(f => {
          return { passed: false, pattern: f }
        }),
        false
      )
}

module.exports = fileExistence
