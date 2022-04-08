/**
 * Check if the bypass label has been found.
 *
 * @param {object} options The rule configuration.
 * @param {string[]} labels The labels of the issue to match against.
 * @returns {boolean} True if bypass label is found, false otherwise.
 */
<<<<<<< HEAD
function hasBypassLabelBeenApplied(options, labels) {
  for (let index = 0; index < labels.length; index++) {
=======
function hasBypassLabelBeenApplied(options, labels)
{
  for (let index = 0; index < labels.length; index++)
  {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
    const label = labels[index]
    if (label.name === options.bypassLabel)
    {
      // Set bypass label to true as it has been seen for this issue
      return true
    }
  }
  return false
}

/**
 * Check if the unique rule id can be found in the issue body.
 *
 * @param {string} body The body of the issue.
 * @returns {string} Returns the rule identifier as a string that was found in the issue body.
 * @returns {null} Returns null if no rule identifier can be found in the issue body.
 */
<<<<<<< HEAD
function retrieveRuleIdentifier(body) {
  if (body.includes('Unique rule set ID: ')) {
    const ruleIdentifier = body.split('Unique rule set ID: ')[1]
    return ruleIdentifier
  } else {
=======
function retrieveRuleIdentifier(body)
{
  if (body.includes('Unique rule set ID: '))
  {
    const ruleIdentifier = body.split('Unique rule set ID: ')[1]
    return ruleIdentifier
  } else
  {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
    console.log('No rule identifier found, was the issue modified manually?')
    return null
  }
}

/**
 * Adds the labels to this target repository on Github.
 *
 * @param {string[]} labelsToCheckOrCreate An array of labels that we should check and possibly add.
<<<<<<< HEAD
 * @param {string} targetOrg Organization/Owner of the repository.
 * @param {string} targetRepository Name of the repository.
 * @param {object} octoKit Instance of Octokit used to call Github API.
 */
async function ensureAddedGithubLabels(
  labelsToCheckOrCreate,
  targetOrg,
  targetRepository,
  octoKit
) {
  for (let i = 0; i < labelsToCheckOrCreate.length; i++) {
    try {
      if (
        !(await doesLabelExistOnRepo(
          targetOrg,
          targetRepository,
          labelsToCheckOrCreate[i],
          octoKit
        ))
      ) {
=======
 */
async function ensureAddedGithubLabels(labelsToCheckOrCreate, targetOrg, targetRepository, octoKit)
{
  for (let i = 0; i < labelsToCheckOrCreate.length; i++)
  {
    try
    {
      if (!await doesLabelExistOnRepo(targetOrg, targetRepository, labelsToCheckOrCreate[i], octoKit))
      {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
        await octoKit.request('POST /repos/{owner}/{repo}/labels', {
          owner: targetOrg,
          repo: targetRepository,
          name: labelsToCheckOrCreate[i]
        })
      }
<<<<<<< HEAD
    } catch (error) {
=======
    } catch (error)
    {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
      console.error(error)
    }
  }
}

/**
 * Checks if a label exists on a repository
 * Returns true if it exists, false otherwise.
 *
 * @param {string} targetOrg Organization/Owner of the repository.
 * @param {string} repo Name of the repository.
 * @param {string} label Label to check for.
<<<<<<< HEAD
 * @param {object} octoKit Instance of Octokit used to call Github API.
 * @returns {boolean} True if label is found, false otherwise.
 */
async function doesLabelExistOnRepo(targetOrg, repo, label, octokit) {
  try {
=======
 */
async function doesLabelExistOnRepo(targetOrg, repo, label, octokit)
{
  try
  {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
    await octokit.request('GET /repos/{owner}/{repo}/labels/{name}', {
      owner: targetOrg,
      repo: repo,
      name: label
    })
<<<<<<< HEAD
  } catch (error) {
    if (error.status === 404) {
      return false
    } else {
=======
  }
  catch (error)
  {
    if (error.status == 404)
    {
      return false
    } else
    {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
      console.error(error)
    }
  }
  return true
}

/**
 * Find existing repolinter issues, open and closed.
 * These issues are found by looking for labels and creator
 *
 * @param {object} options The rule configuration.
<<<<<<< HEAD
 * @param {string} targetOrg Organization/Owner of the repository.
 * @param {string} targetRepository Name of the repository.
 * @param {object} octokit Instance of Octokit used to call Github API.
=======
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
 * @returns {null} Returns null if no issue can be found.
 * @returns {object[]} Returns array of issues if issues can be found that match the criteria. This array is sorted by
 *  last created date. Latest created issues show up first.
 */
<<<<<<< HEAD
async function findExistingRepolinterIssues(
  options,
  targetOrg,
  targetRepository,
  octokit
) {
  // Get issues by creator/labels
  let issues = []
  try {
    issues = await octokit.request('GET /repos/{owner}/{repo}/issues', {
      owner: targetOrg,
      repo: targetRepository,
      labels: options.issueLabels.join(),
      state: 'all',
      sort: 'created',
      direction: 'desc'
    })
  } catch (e) {
    console.error(e)
  }
  // If there are no issues, return null
  if (issues.data.length === 0) {
=======
async function findExistingRepolinterIssues(options, targetOrg, targetRepository, octokit)
{
  // Get issues by creator/labels
  let issues = []
  try
  {
    issues = await octokit.request(
      'GET /repos/{owner}/{repo}/issues',
      {
        owner: targetOrg,
        repo: targetRepository,
        labels: options.issueLabels.join(),
        state: 'all',
        sort: 'created',
        direction: 'desc'
      }
    )
  } catch (e)
  {
    console.error(e)
  }
  // If there are no issues, return null
  if (issues.data.length === 0)
  {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
    return null
  }

  const openIssues = issues.data.filter(({ state }) => state === 'open')
<<<<<<< HEAD
  if (openIssues.length > 1) {
=======
  if (openIssues.length > 1)
  {
>>>>>>> 5b7a6a6 (Add additional helper tests and mock Github using Nock)
    console.warn(
      `Found more than one matching open issue: ${openIssues
        .map(i => `#${i.number}`)
        .join(', ')}.`
    )
  }
  return issues.data
}

module.exports = {
  hasBypassLabelBeenApplied,
  retrieveRuleIdentifier,
  ensureAddedGithubLabels,
  findExistingRepolinterIssues
}
