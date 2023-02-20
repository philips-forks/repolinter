// Copyright 2017 TODO Group. All rights reserved.
// SPDX-License-Identifier: Apache-2.0

const chai = require('chai')
const expect = chai.expect

describe('rule', () => {
  describe('files_hash', () => {
    const fileContents = require('../../rules/file-hash')
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
    it('returns passes if requested file matches the hash', async () => {
      /** @type {any} */
      const mockfs = {
        findFirstFile() {
          return 'README.md'
        },
        getFileContents() {
          return 'foo'
        },
        targetDir: '.'
      }

      const ruleopts = {
        globsAny: ['README.md'],
        hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae'
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

    it('returns passes if requested file matches the hash with nocase', async () => {
      /** @type {any} */
      const mockfs = {
        findFirstFile() {
          return 'README.md'
        },
        getFileContents() {
          return 'foo'
        },
        targetDir: '.'
      }

      const ruleopts = {
        globsAny: ['ReAdMe.md'],
        hash:
          '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
        nocase: true
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

    it('returns passes if requested file contents exists different algorithm', async () => {
      /** @type {any} */
      const mockfs = {
        findFirstFile() {
          return 'README.md'
        },
        getFileContents() {
          return 'foo'
        },
        targetDir: '.'
      }

      const ruleopts = {
        globsAny: ['README.md'],
        algorithm: 'sha512',
        hash:
          'f7fbba6e0636f890e56fbbf3283e524c6fa3204ae298382d624741d0dc6638326e282c41be5e4254d8820772c5518a2c5a8c0c7f7eda19594a7eb539453e1ed7'
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

    it('returns fails if requested file does not match', async () => {
      /** @type {any} */
      const mockfs = {
        findFirstFile() {
          return 'README.md'
        },
        getFileContents() {
          return 'foo'
        },
        targetDir: '.'
      }

      const ruleopts = {
        globsAny: ['README.md'],
        hash: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
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
    })

    it('returns failure if requested file does not exist', async () => {
      /** @type {any} */
      const mockfs = {
        findFirstFile() {
          return undefined
        },
        getFileContents() {},
        targetDir: '.'
      }

      const ruleopts = {
        globsAny: ['README.md'],
        content: 'foo'
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

    it('returns success if file does not exist with success flag', async () => {
      /** @type {any} */
      const mockfs = {
        findFirstFile() {
          return undefined
        },
        getFileContents() {},
        targetDir: '.'
      }

      const ruleopts = {
        globsAny: ['README.md'],
        content: 'foo',
        'succeed-on-non-existent': true
      }

      const actual = await fileContents(
        mockfs,
        ruleopts,
        undefined,
        undefined,
        mockGit
      )

      expect(actual.passed).to.equal(true)
    })

    it('respect the legacy configuration format', async () => {
      /** @type {any} */
      const mockfs = {
        findFirstFile() {
          return 'README.md'
        },
        getFileContents() {
          return 'foo'
        },
        targetDir: '.'
      }

      const ruleopts = {
        files: ['README.md'],
        hash: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae'
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
  })
})
