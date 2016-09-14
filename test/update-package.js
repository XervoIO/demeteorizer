const Path = require('path')

const Code = require('code')
const Lab = require('lab')
const Proxyquire = require('proxyquire')
const Sinon = require('sinon')

var fsStub = {}
var UpdatePackage = Proxyquire('../lib/update-package', {
  fs: fsStub
})

var lab = exports.lab = Lab.script()

var describe = lab.describe
var before = lab.beforeEach
var it = lab.it
var expect = Code.expect

describe('update-package', function () {
  describe('fails', function () {
    before(function (done) {
      fsStub.existsSync = Sinon.stub().returns(false)
      done()
    })

    it('if no options object is provided', function (done) {
      expect(function () {
        UpdatePackage()
      }).to.throw()

      done()
    })

    it('if output directory does not exist', function (done) {
      expect(function () {
        UpdatePackage({ directory: '' }, function () {})
      }).to.throw()

      done()
    })
  })

  describe('successfully', function () {
    before(function (done) {
      fsStub.existsSync = Sinon.stub().returns(true)
      fsStub.readFileSync = Sinon.stub().returns('{}')
      fsStub.chmodSync = Sinon.stub()
      fsStub.writeFile = Sinon.stub().yields(null)
      done()
    })

    it('creates a valid package.json', function (done) {
      UpdatePackage({ directory: '' }, function () {
        expect(fsStub.writeFile.called).to.be.true()
        done()
      })
    })
  })

  describe('merges json from options into package.json', function () {
    before(function (done) {
      fsStub.existsSync = Sinon.stub().returns(true)
      fsStub.readFileSync = Sinon.stub().returns('{}')
      fsStub.chmodSync = Sinon.stub()
      fsStub.writeFile = Sinon.stub().yields(null)
      done()
    })

    it('creates a valid package.json', function (done) {
      UpdatePackage({ directory: '', json: { test: true } }, function () {
        var path = Path.resolve('./bundle/programs/server/package.json')
        var json = [
          '{',
          '  "engines": {',
          '    "node": "0.10.33",',
          '    "npm": "latest"',
          '  },',
          '  "main": "../../main.js",',
          '  "scripts": {',
          '    "start": "node ../../main"',
          '  },',
          '  "test": true',
          '}'].join('\n')

        expect(fsStub.writeFile.calledWith(path, json)).to.be.true()
        done()
      })
    })
  })

  describe('uses npm version specified from options', function () {
    it('sets npm version using options.npmVersion', function (done) {
      UpdatePackage({ directory: '', npmVersion: '3.9.0' }, function () {
        var path = Path.resolve('./bundle/programs/server/package.json')
        var json = [
          '{',
          '  "engines": {',
          '    "node": "0.10.33",',
          '    "npm": "3.9.0"',
          '  },',
          '  "main": "../../main.js",',
          '  "scripts": {',
          '    "start": "node ../../main"',
          '  }',
          '}'].join('\n')

        expect(fsStub.writeFile.calledWith(path, json)).to.be.true()
        done()
      })
    })
  })
})
