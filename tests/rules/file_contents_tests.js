// Copyright 2017 TODO Group. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const chai = require('chai')
const expect = chai.expect
const FileSystem = require('../../lib/file_system')
const cp = require('child_process')
const path = require('path')

/**
 * Execute a command in a childprocess asynchronously. Not secure, but good for testing.
 *
 * @param {string} command The command to execute
 * @param {import('child_process').ExecOptions} [opts] Options to execute against.
 * @returns {Promise<{out: string, err: string, code: number}>} The command output
 */
async function execAsync(command, opts = {}) {
  return new Promise((resolve, reject) => {
    cp.exec(command, opts, (err, outstd, errstd) =>
      err !== null && err.code === undefined
        ? reject(err)
        : resolve({
            out: outstd,
            err: errstd,
            code: err !== null ? err.code : 0
          })
    )
  })
}

describe('rule', () => {
  const fileContents = require('../../rules/file-contents')
  describe('files_contents', () => {
    const mockGit = {
      branchLocal() {
        return { current: 'master' }
      },
      getRemotes() {
        return [{ name: 'origin' }]
      },
      addConfig() {
        return Promise.resolve
      },
      remote() {
        return Promise.resolve
      },
      branch() {
        return { all: ['master'] }
      },
      checkout() {
        return Promise.resolve
      }
    }
    it('returns passes if requested file contents exists', async () => {
      /** @type {any} */
      const mockfs = {
        findAllFiles() {
          return ['README.md']
        },
        getFileContents() {
          return 'foo'
        },
        targetDir: '.'
      }

      const ruleopts = {
        globsAll: ['README*'],
        content: 'foo'
      }

      const actual = await fileContents(
        mockfs,
        ruleopts,
        undefined,
        undefined,
        mockGit
      )
      expect(actual.passed).to.equal(true)
      expect(actual.targets).to.have.length(1)
      expect(actual.targets[0]).to.deep.include({
        passed: true,
        path: 'README.md'
      })
    })

    it('returns passes if requested file contents exists with human-readable contents', async () => {
      /** @type {any} */
      const mockfs = {
        findAllFiles() {
          return ['README.md']
        },
        getFileContents() {
          return 'foo'
        },
        targetDir: '.'
      }
      const ruleopts = {
        globsAll: ['README*'],
        content: '[abcdef][oO0][^q]',
        'human-readable-content': 'actually foo'
      }

      const actual = await fileContents(
        mockfs,
        ruleopts,
        undefined,
        undefined,
        mockGit
      )
      expect(actual.passed).to.equal(true)
      expect(actual.targets).to.have.length(1)
      expect(actual.targets[0]).to.deep.include({
        passed: true,
        path: 'README.md'
      })
      expect(actual.targets[0].message).to.contain(
        ruleopts['human-readable-content']
      )
    })

    it('returns fails if requested file contents does not exist', async () => {
      /** @type {any} */
      const mockfs = {
        findAllFiles() {
          return ['README.md']
        },
        getFileContents() {
          return 'foo'
        },
        targetDir: '.'
      }

      const ruleopts = {
        globsAll: ['README*'],
        content: 'bar'
      }

      const actual = await fileContents(
        mockfs,
        ruleopts,
        undefined,
        undefined,
        mockGit
      )

      expect(actual.passed).to.equal(false)
      expect(actual.targets).to.have.length(1)
      expect(actual.targets[0]).to.deep.include({
        passed: false,
        path: 'README.md'
      })
      expect(actual.targets[0].message).to.contain(ruleopts.content)
    })

    it('returns the pattern if requested file does not exist', async () => {
      /** @type {any} */
      const mockfs = {
        findAllFiles() {
          return []
        },
        getFileContents() {},
        targetDir: '.'
      }
      const ruleopts = {
        globsAll: ['README.md'],
        content: 'foo'
      }

      const actual = await fileContents(
        mockfs,
        ruleopts,
        undefined,
        undefined,
        mockGit
      )
      expect(actual.passed).to.equal(true)
      expect(actual.targets).to.have.length(1)
      expect(actual.targets[0].passed).to.equal(false)
      expect(actual.targets[0].pattern).to.equal(ruleopts.globsAll[0])
    })

    it('returns failure if file does not exist with failure flag', async () => {
      /** @type {any} */
      const mockfs = {
        findAllFiles() {
          return []
        },
        getFileContents() {},
        targetDir: '.'
      }
      const ruleopts = {
        globsAll: ['README.md', 'READMOI.md'],
        content: 'foo',
        'fail-on-non-existent': true
      }

      const actual = await fileContents(
        mockfs,
        ruleopts,
        undefined,
        undefined,
        mockGit
      )

      expect(actual.passed).to.equal(false)
    })

    it('should handle broken symlinks', async () => {
      const brokenSymlink = './tests/rules/broken_symlink_for_test'
      const stat = require('fs').lstatSync(brokenSymlink)
      expect(stat.isSymbolicLink()).to.equal(true)
      const fs = new FileSystem(require('path').resolve('.'))

      const rule = {
        globsAll: [brokenSymlink],
        lineCount: 1,
        patterns: ['something']
      }
      const actual = await fileContents(fs, rule, undefined, undefined, mockGit)

      expect(actual.passed).to.equal(true)
    })
  })
  describe('rule file_contents in branch', function () {
    const repolinterPath =
      process.platform === 'win32'
        ? path.resolve('bin/repolinter.bat')
        : path.resolve('bin/repolinter.js')
    this.timeout(30000)
    describe('when checking only default branch', () => {
      it('returns should not find content from different branches', async () => {})
    })
    describe('when checking various branches', () => {
      it('returns content from both default and target branch', async () => {
        const actual = await execAsync(
          `${repolinterPath} lint -g https://github.com/Brend-Smits/repolinter-tests.git --rulesetFile rulesets/any-content-check-branch.json`
        )

        expect(actual.code).to.equal(0)
        expect(actual.out.trim()).to.contain('Lint:')
      })
      it('returns matched content from different branch that is not default', async () => {})
    })
  })
})
