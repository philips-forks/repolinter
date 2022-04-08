// Copyright 2017 TODO Group. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const Result = require('../lib/result')
const InternalHelpers = require('./helpers/github-issue-create-helpers')
// eslint-disable-next-line no-unused-vars
const { Octokit } = require('@octokit/rest')
let targetOrg = ''
let targetRepository = ''

/**
 * Create a Github Issue on the targeted repository specifically for this broken rule.
 *
 * @param {FileSystem} fs A filesystem object configured with filter paths and target directories
 * @param {object} options The rule configuration
 * @param {string[]} targets The files to modify (will be overridden by options if present)
 * @param {boolean} dryRun If true, repolinter will report suggested fixes, but will make no disk modifications.
 * @returns {Promise<Result>} The fix result
 */
<<<<<<< HEAD
async function createGithubIssue(fs, options, targets, dryRun = false) {
  try {
    try {
      await prepareWorkingEnvironment(dryRun)
    } catch (error) {
=======
async function createGithubIssue(fs, options, targets, dryRun = false)
{
  try
  {
    try
    {
      await prepareWorkingEnvironment(dryRun)
    } catch (error)
    {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
      return new Result(error.message, [], false)
    }

    // Create Labels
    const labels = options.issueLabels
    labels.push(options.bypassLabel)
<<<<<<< HEAD
    await InternalHelpers.ensureAddedGithubLabels(
      labels,
      targetOrg,
      targetRepository,
      this.Octokit
    )
=======
    await InternalHelpers.ensureAddedGithubLabels(labels, targetOrg, targetRepository, this.Octokit)
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
    options.issueLabels = options.issueLabels.filter(
      label => label !== options.bypassLabel
    )

    // Find issues created by Repolinter
<<<<<<< HEAD
    const issues = await InternalHelpers.findExistingRepolinterIssues(
      options,
      targetOrg,
      targetRepository,
      this.Octokit
    )

    // If there are no issues, create one.
    // If there are issues, we loop through them and handle each each on it's own
    if (issues === null || issues === undefined) {
=======
    const issues = await InternalHelpers.findExistingRepolinterIssues(options, targetOrg, targetRepository, this.Octokit)

    // If there are no issues, create one.
    // If there are issues, we loop through them and handle each each on it's own
    if (issues === null || issues === undefined)
    {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
      // Issue should include the broken rule, a message in the body and a label.
      const createdIssue = await createIssueOnGithub(options)
      // We are done here, we created a new issue.
      return new Result(
        `No Open/Closed issues were found for this rule - Created new Github Issue with issue number - ${createdIssue.data.number}`,
        [],
        true
      )
    }

    const openIssues = issues.filter(issue => issue.state === 'open')
<<<<<<< HEAD
    for (let i = 0; i < openIssues.length; i++) {
=======
    for (let i = 0; i < openIssues.length; i++)
    {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
      const issue = openIssues[i]
      // Issue is open, check body and find what rules have been broken.
      // If the rule that has been broken, is already listed in the issue body/title, do nothing
      const ruleIdentifier = InternalHelpers.retrieveRuleIdentifier(issue.body)
<<<<<<< HEAD
      if (ruleIdentifier === options.uniqueRuleId) {
        if (InternalHelpers.hasBypassLabelBeenApplied(options, issue.labels)) {
=======
      if (ruleIdentifier === options.uniqueRuleId)
      {
        if (InternalHelpers.hasBypassLabelBeenApplied(options, issue.labels))
        {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
          // Bypass label has been seen for this issue, we can ignore it.
          return new Result(
            `Rule fix failed as Github Issue ${issue.number} has bypass label.`,
            [],
            true
          )
<<<<<<< HEAD
        } else {
          return new Result(
            `No Github Issue Created - Issue already exists with correct unique identifier`,
            [],
            true
          )
=======
        } else
        {
        return new Result(
          `No Github Issue Created - Issue already exists with correct unique identifier`,
          [],
          true
        )
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
        }
      }
    }

    const closedIssues = issues.filter(issue => issue.state === 'closed')
<<<<<<< HEAD
    for (let i = 0; i < closedIssues.length; i++) {
      const issue = closedIssues[i]
      const ruleIdentifier = InternalHelpers.retrieveRuleIdentifier(issue.body)

      if (ruleIdentifier === options.uniqueRuleId) {
        // This means that there is regression, we should update the issue with new body and comment on it.
        if (InternalHelpers.hasBypassLabelBeenApplied(options, issue.labels)) {
=======
    for (let i = 0; i < closedIssues.length; i++)
    {
      const issue = closedIssues[i]
      const ruleIdentifier = InternalHelpers.retrieveRuleIdentifier(issue.body)

      if (ruleIdentifier === options.uniqueRuleId)
      {
        // This means that there is regression, we should update the issue with new body and comment on it.
        if (InternalHelpers.hasBypassLabelBeenApplied(options, issue.labels))
        {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
          // Bypass label has been seen for this issue, we can ignore it.
          return new Result(
            `Rule fix failed as Github Issue ${issue.number} has bypass label.`,
            [],
            true
          )
<<<<<<< HEAD
        } else {
=======
        } else
        {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
          await updateIssueOnGithub(options, issue.number)
          await commentOnGithubIssue(options, issue.number)
          return new Result(
            `Github Issue ${issue.number} re-opened as there seems to be regression!`,
            [],
            true
          )
        }
<<<<<<< HEAD
      } else {
=======
      } else
      {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
        console.log(
          'Issue: ' + issue.number + ' - No matching rule identifier was found'
        )
      }
    }
    // There are open/closed issues from Continuous Compliance, but non of them are for this ruleset
    // Issue should include the broken rule, a message in the body and a label.
    const newIssue = await createIssueOnGithub(options)
<<<<<<< HEAD
    return new Result(
      `Github Issue ${newIssue.data.number} Created!`,
      targets,
      true
    )
  } catch (e) {
    console.error(e)
  }
}
=======
    return new Result(`Github Issue ${newIssue.data.number} Created!`, targets, true)
  }
  catch (e)
  {
    console.error(e)
  }
}


>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)

/**
 * Create an issue on Github with labels and all on the target repository.
 *
 * @param {object} options The rule configuration.
 * @returns {object} Returns issue after adding it via the Github API.
 */
async function createIssueOnGithub(options)
{
  try
  {
    const issueBodyWithId = options.issueBody.concat(
      `\n Unique rule set ID: ${options.uniqueRuleId}`
    )
    return await this.Octokit.request('POST /repos/{owner}/{repo}/issues', {
      owner: targetOrg,
      repo: targetRepository,
      title: options.issueTitle,
      body: issueBodyWithId,
      labels: options.issueLabels
    })
  } catch (e)
  {
    console.error(e)
  }
}

/**
 * Update specific issue on Github.
 *
 * @param {object} options The rule configuration.
 * @param {string} issueNumber The number of the issue we should update.
 * @returns {object} Returns issue after updating it via the Github API.
 */
async function updateIssueOnGithub(options, issueNumber)
{
  try
  {
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
        state: 'open'
      }
    )
  } catch (e)
  {
    console.error(e)
  }
}

/**
 * Comment on a specific issue on Github.
 *
 * @param {object} options The rule configuration.
 * @param {string} issueNumber The number of the issue we should update.
 * @returns {object} Returns issue after commenting on it via the Github API.
 */
async function commentOnGithubIssue(options, issueNumber)
{
  try
  {
    return await this.Octokit.request(
      'POST /repos/{owner}/{repo}/issues/{issue_number}/comments',
      {
        owner: targetOrg,
        repo: targetRepository,
        issue_number: issueNumber,
        body: options.commentBody
      }
    )
  } catch (e)
  {
    console.error(e)
  }
}

<<<<<<< HEAD
=======

>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
/**
 * Prepare our working environment.
 * Check if environment variables are set.
 * @param {string} dryRun Enable this if you want to test without configuring environment variables
 * Set constants like targetOrg and targetRepository and initialize OctoKit.
 *
 */
<<<<<<< HEAD
async function prepareWorkingEnvironment(dryRun) {
  if (!dryRun) {
    const targetRepoEnv = process.env.TARGET_REPO
    const authTokenEnv = process.env.GITHUB_TOKEN
    if (authTokenEnv === undefined || targetRepoEnv === undefined) {
=======
async function prepareWorkingEnvironment(dryRun)
{
  if (!dryRun)
  {
    const targetRepoEnv = process.env.TARGET_REPO
    const authTokenEnv = process.env.GITHUB_TOKEN
    if (authTokenEnv === undefined || targetRepoEnv === undefined)
    {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
      throw new Error(
        'Could not perform fix due to missing/invalid environment variables! Please set TARGET_REPO and GITHUB_TOKEN environment variables.'
      )
    }
    targetOrg = targetRepoEnv.split('/')[0]
    targetRepository = targetRepoEnv.split('/')[1]
<<<<<<< HEAD
=======
    // Prepare
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
    this.Octokit = new Octokit({
      auth: authTokenEnv,
      baseUrl: 'https://api.github.com',
      owner: targetOrg,
      repo: targetRepository
    })
<<<<<<< HEAD
  } else {
    targetOrg = 'test'
    targetRepository = 'tester-repo'
    this.Octokit = new Octokit({
      auth: 'fake',
      baseUrl: 'https://api.github.com'
    })
  }
=======
  } else
  {
    targetOrg = 'test'
    targetRepository = 'tester-repo'
    // Prepare
    this.Octokit = new Octokit({
      auth: 'fake',
      baseUrl: 'https://api.github.com',
    })
  }


>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
}

module.exports = createGithubIssue
