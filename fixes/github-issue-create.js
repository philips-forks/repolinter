// Copyright 2017 TODO Group. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const Result = require('../lib/result')
const InternalHelpers = require('./helpers/github-issue-create-helpers')
const { Octokit } = require('@octokit/rest')
let targetOrg = ''
let targetRepository = ''
let issueAssignees = new Array(0)
const maxAssigneeRetryCount = 5

/**
 * Create a GitHub Issue on the targeted repository specifically for this broken rule.
 *
 * @param {FileSystem} fs A filesystem object configured with filter paths and target directories
 * @param {object} options The rule configuration
 * @param {string[]} targets The files to modify (will be overridden by options if present)
 * @param {boolean} dryRun If true, repolinter will report suggested fixes, but will make no disk modifications.
 * @returns {Promise<Result>} The fix result
 */
async function createGithubIssue(fs, options, targets, dryRun = false) {
  try {
    try {
      await prepareWorkingEnvironment(dryRun)
    } catch (error) {
      return new Result(error.message, [], false)
    }

    // Create Labels
    const labels = options.issueLabels
    labels.push(options.bypassLabel)
    await InternalHelpers.ensureAddedGithubLabels(
      labels,
      targetOrg,
      targetRepository,
      this.Octokit
    )
    options.issueLabels = options.issueLabels.filter(
      label => label !== options.bypassLabel
    )

    // Find issues created by Repolinter
    const issues = await InternalHelpers.findExistingRepolinterIssues(
      options,
      targetOrg,
      targetRepository,
      this.Octokit
    )

    let Contributors = []
    // Retrieve committers of a repository if assignTopCommitter option is set or undefined.
    if (options.assignTopCommitter === undefined) {
      options.assignTopCommitter = true
    }
    if (options.assignTopCommitter) {
      Contributors = await getTopCommittersOfRepository(
        targetOrg,
        targetRepository
      )
      if (Contributors !== undefined && Contributors.data.length > 0) {
        issueAssignees.push(Contributors.data[0].login)
      }
    }

    // If there are no issues, create one.
    // If there are issues, we loop through them and handle each on its own
    if (issues === null || issues === undefined) {
      try {
        // Issue should include the broken rule, a message in the body and a label.
        const createdIssue = await createIssueOnGithub(options, Contributors)
        // We are done here, we created a new issue.
        return new Result(
          `No Open/Closed issues were found for this rule - Created new Github Issue with issue number - ${createdIssue.data.number}`,
          [],
          true
        )
      } catch (e) {
        return new Result(
          `Something went wrong when trying to create the issue: ${e.message}`,
          [],
          false
        )
      }
    }

    const openIssues = issues.filter(issue => issue.state === 'open')
    for (let i = 0; i < openIssues.length; i++) {
      const issue = openIssues[i]
      // Issue is open, check body and find what rules have been broken.
      // If the rule that has been broken, is already listed in the issue body/title, do nothing
      const ruleIdentifier = InternalHelpers.retrieveRuleIdentifier(issue.body)
      if (ruleIdentifier === options.uniqueRuleId) {
        if (InternalHelpers.hasBypassLabelBeenApplied(options, issue.labels)) {
          // Bypass label has been seen for this issue, we can ignore it.
          return new Result(
            `Rule fix failed as Github Issue ${issue.number} has bypass label.`,
            [],
            true
          )
        } else {
          if (
            issue.body !== InternalHelpers.generateIssueBody(options) ||
            issue.title !== options.issueTitle ||
            (issue.assignees.length === 0 && options.assignTopCommitter)
          ) {
            try {
              // Issue should include the broken rule, a message in the body and a label.
              await updateIssueOnGithub(options, issue.number, 0, Contributors)
            } catch (e) {
              return new Result(
                `Something went wrong when trying to update issue id: ${issue.number}: ${e.message}`,
                [],
                false
              )
            }
          }
          return new Result(
            `No Github Issue Created - Issue already exists with correct unique identifier`,
            [],
            true
          )
        }
      }
    }

    const closedIssues = issues.filter(issue => issue.state === 'closed')
    for (let i = 0; i < closedIssues.length; i++) {
      const issue = closedIssues[i]
      const ruleIdentifier = InternalHelpers.retrieveRuleIdentifier(issue.body)

      if (ruleIdentifier === options.uniqueRuleId) {
        // This means that there is regression, we should update the issue with new body and comment on it.
        if (InternalHelpers.hasBypassLabelBeenApplied(options, issue.labels)) {
          // Bypass label has been seen for this issue, we can ignore it.
          return new Result(
            `Rule fix failed as Github Issue ${issue.number} has bypass label.`,
            [],
            true
          )
        } else {
          try {
            // Issue should include the broken rule, a message in the body and a label.
            await updateIssueOnGithub(options, issue.number, 0, Contributors)
          } catch (e) {
            return new Result(
              `Something went wrong when trying to update issue id: ${issue.number}: ${e.message}`,
              [],
              false
            )
          }
          await commentOnGithubIssue(options, issue.number)
          return new Result(
            `Github Issue ${issue.number} re-opened as there seems to be regression!`,
            [],
            true
          )
        }
      } else {
        console.log(
          'Issue: ' + issue.number + ' - No matching rule identifier was found'
        )
      }
    }
    // There are open/closed issues from Continuous Compliance, but non of them are for this ruleset
    // Issue should include the broken rule, a message in the body and a label.
    try {
      // Issue should include the broken rule, a message in the body and a label.
      const newIssue = await createIssueOnGithub(options, Contributors)
      // We are done here, we created a new issue.
      return new Result(
        `Github Issue ${newIssue.data.number} Created!`,
        targets,
        true
      )
    } catch (e) {
      return new Result(
        `Something went wrong when trying to create the issue: ${e.message}`,
        [],
        false
      )
    }
  } catch (e) {
    console.error(e)
  }
}

/**
 * Retrieve the top contributor by commit count of a repository.
 *
 * @param {object} targetOrg Target Organization
 * @param {object} targetRepository Target Repository
 * @returns {object} Returns array of contributors.
 */
async function getTopCommittersOfRepository(targetOrg, targetRepository) {
  try {
    return await this.Octokit.request(
      'GET /repos/{owner}/{repo}/contributors',
      {
        owner: targetOrg,
        repo: targetRepository
      }
    )
  } catch (e) {
    console.error(e)
  }
}

/**
 * Create an issue on GitHub with labels and all on the target repository.
 *
 * @param {object} options The rule configuration.
 * @param {array<object>} contributors array of contributors
 * @param {number} contributorSelectIndex counter for which assignee was selected
 * @returns {object} Returns issue after adding it via the GitHub API.
 */
async function createIssueOnGithub(
  options,
  contributors,
  contributorSelectIndex = 0
) {
  // This might not be needed
  return await this.Octokit.request('POST /repos/{owner}/{repo}/issues', {
    owner: targetOrg,
    repo: targetRepository,
    title: options.issueTitle,
    body: InternalHelpers.generateIssueBody(options),
    labels: options.issueLabels,
    assignees: issueAssignees
  }).catch(error => {
    if (
      error.status === 422 &&
      error.message.indexOf('Validation Failed: ') !== -1 &&
      error.message.indexOf('"field":"assignees","code":"invalid"}')
    ) {
      issueAssignees = []
      if (
        contributorSelectIndex < contributors.data.length &&
        contributorSelectIndex <= maxAssigneeRetryCount
      ) {
        contributorSelectIndex++
        issueAssignees.push(contributors.data[contributorSelectIndex].login)
      }
      console.log(
        `Create issue for ${contributors.data[contributorSelectIndex].login}`
      )
      return createIssueOnGithub(options, contributors, contributorSelectIndex)
    } else {
      return Promise.reject(error)
    }
  })
}
/**
 * Update specific issue on Github.
 *
 * @param {object} options The rule configuration.
 * @param {string} issueNumber The number of the issue we should update.
 * @param {number} assigneeSelectCount counter for which assignee was selected
 * @param {array<object>} assignees array of contributors
 * @returns {object} Returns issue after updating it via the Github API.
 */
async function updateIssueOnGithub(
  options,
  issueNumber,
  assigneeSelectCount,
  assignees
) {
  // This might not be needed
  const issueBodyWithId = options.issueBody.concat(
    `\n Unique rule set ID: ${options.uniqueRuleId}`
  )
  return await this.Octokit.request(
    'PATCH /repos/{owner}/{repo}/issues/{issue_number}',
    {
      owner: targetOrg,
      repo: targetRepository,
      issue_number: issueNumber,
      title: options.issueTitle,
      body: issueBodyWithId,
      labels: options.issueLabels,
      assignees: issueAssignees,
      state: 'open'
    }
  ).catch(error => {
    if (
      error.status === 422 &&
      error.message.indexOf('Validation Failed: ') !== -1 &&
      error.message.indexOf('"field":"assignees","code":"invalid"}')
    ) {
      issueAssignees = []
      if (
        assigneeSelectCount <= assignees.data.length &&
        assigneeSelectCount <= maxAssigneeRetryCount
      ) {
        assigneeSelectCount++
        issueAssignees.push(assignees.data[assigneeSelectCount].login)
      }
      return updateIssueOnGithub(
        options,
        issueNumber,
        assigneeSelectCount,
        assignees
      )
    } else {
      return Promise.reject(error)
    }
  })
}

/**
 * Comment on a specific issue on Github.
 *
 * @param {object} options The rule configuration.
 * @param {string} issueNumber The number of the issue we should update.
 * @returns {object} Returns issue after commenting on it via the Github API.
 */
async function commentOnGithubIssue(options, issueNumber) {
  try {
    return await this.Octokit.request(
      'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
      {
        owner: targetOrg,
        repo: targetRepository,
        issue_number: issueNumber,
        body: options.commentBody
      }
    )
  } catch (e) {
    console.error(e)
  }
}

/**
 * Prepare our working environment.
 * Check if environment variables are set.
 * @param {string} dryRun Enable this if you want to test without configuring environment variables
 * Set constants like targetOrg and targetRepository and initialize OctoKit.
 *
 */
async function prepareWorkingEnvironment(dryRun) {
  if (!dryRun) {
    const targetRepoEnv = process.env.TARGET_REPO
    const authTokenEnv = process.env.GITHUB_TOKEN
    if (authTokenEnv === undefined || targetRepoEnv === undefined) {
      throw new Error(
        'Could not perform fix due to missing/invalid environment variables! Please set TARGET_REPO and GITHUB_TOKEN environment variables.'
      )
    }
    targetOrg = targetRepoEnv.split('/')[0]
    targetRepository = targetRepoEnv.split('/')[1]
    this.Octokit = new Octokit({
      auth: authTokenEnv,
      baseUrl: 'https://api.github.com',
      owner: targetOrg,
      repo: targetRepository
    })
  } else {
    targetOrg = 'test'
    targetRepository = 'tester-repo'
    this.Octokit = new Octokit({
      auth: 'fake',
      baseUrl: 'https://api.github.com'
    })
  }
}

module.exports = createGithubIssue
