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
var beforeEach = lab.beforeEach
var it = lab.it
var expect = Code.expect

describe('update-package', () => {
  var options

  beforeEach((done) => {
    options = {
      directory: process.cwd(),
      nodeVersion: '4.2.0',
      input: process.cwd(),
      json: { test: true },
      npmVersion: '3.9.0'
    }

    done()
  })

  describe('fails', () => {
    beforeEach((done) => {
      fsStub.existsSync = Sinon.stub().returns(false)
      done()
    })

    it('if no options object is provided', (done) => {
      expect(() => {
        UpdatePackage()
      }).to.throw()

      done()
    })

    it('if output directory does not exist', (done) => {
      expect(() => {
        UpdatePackage(options, () => {})
      }).to.throw()

      done()
    })
  })

  describe('successfully', () => {
    beforeEach((done) => {
      fsStub.existsSync = Sinon.stub().returns(true)
      fsStub.readFileSync = Sinon.stub().returns('{}')
      fsStub.chmodSync = Sinon.stub()
      fsStub.writeFile = Sinon.stub().yields(null)
      done()
    })

    it('creates a valid package.json', (done) => {
      UpdatePackage(options, () => {
        expect(fsStub.writeFile.called).to.be.true()
        done()
      })
    })
  })

  describe('merges json from options into package.json', () => {
    beforeEach((done) => {
      fsStub.existsSync = Sinon.stub().returns(true)
      fsStub.readFileSync = Sinon.stub().returns('{}')
      fsStub.chmodSync = Sinon.stub()
      fsStub.writeFile = Sinon.stub().yields(null)
      done()
    })

    it('creates a valid package.json', (done) => {
      UpdatePackage(options, () => {
        var path = Path.resolve('./bundle/programs/server/package.json')
        var json = [
          '{',
          '  "engines": {',
          `    "node": "${options.nodeVersion}",`,
          `    "npm": "${options.npmVersion}"`,
          '  },',
          '  "main": "../../main.js",',
          '  "scripts": {',
          '    "start": "node ../../main"',
          '  },',
          `  "test": ${options.json.test}`,
          '}'].join('\n')

        expect(fsStub.writeFile.calledWith(path, json)).to.be.true()
        done()
      })
    })
  })

  describe('merges empty json options into package.json', () => {
    beforeEach((done) => {
      fsStub.existsSync = Sinon.stub().returns(true)
      fsStub.readFileSync = Sinon.stub().returns('{}')
      fsStub.chmodSync = Sinon.stub()
      fsStub.writeFile = Sinon.stub().yields(null)
      done()
    })

    it('creates a valid package.json', (done) => {
      delete options.json
      UpdatePackage(options, () => {
        var path = Path.resolve('./bundle/programs/server/package.json')
        var json = [
          '{',
          '  "engines": {',
          `    "node": "${options.nodeVersion}",`,
          `    "npm": "${options.npmVersion}"`,
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

  describe('uses node version specified from options', () => {
    it('sets node version using options.nodeVersion', (done) => {
      UpdatePackage(options, () => {
        var path = Path.resolve('./bundle/programs/server/package.json')
        var json = [
          '{',
          '  "engines": {',
          `    "node": "${options.nodeVersion}",`,
          `    "npm": "${options.npmVersion}"`,
          '  },',
          '  "main": "../../main.js",',
          '  "scripts": {',
          '    "start": "node ../../main"',
          '  },',
          `  "test": ${options.json.test}`,
          '}'].join('\n')

        expect(fsStub.writeFile.calledWith(path, json)).to.be.true()
        done()
      })
    })
  })

  describe('uses node version set in boot.js', () => {
    it('sets node version using default version', (done) => {
      delete options.nodeVersion
      UpdatePackage(options, () => {
        var path = Path.resolve('./bundle/programs/server/package.json')
        var json = [
          '{',
          '  "engines": {',
          `    "node": "0.10.33",`,
          `    "npm": "${options.npmVersion}"`,
          '  },',
          '  "main": "../../main.js",',
          '  "scripts": {',
          '    "start": "node ../../main"',
          '  },',
          `  "test": ${options.json.test}`,
          '}'].join('\n')

        expect(fsStub.writeFile.calledWith(path, json)).to.be.true()
        done()
      })
    })
  })

  describe('uses npm version specified from options', () => {
    it('sets npm version using options.npmVersion', (done) => {
      UpdatePackage(options, () => {
        var path = Path.resolve('./bundle/programs/server/package.json')
        var json = [
          '{',
          '  "engines": {',
          `    "node": "${options.nodeVersion}",`,
          `    "npm": "${options.npmVersion}"`,
          '  },',
          '  "main": "../../main.js",',
          '  "scripts": {',
          '    "start": "node ../../main"',
          '  },',
          `  "test": ${options.json.test}`,
          '}'].join('\n')

        expect(fsStub.writeFile.calledWith(path, json)).to.be.true()
        done()
      })
    })
  })

  describe('uses bundle package.json for npm version', () => {
    it('sets npm version to bundle engines npm version', (done) => {
      var pkg = require(Path.resolve(options.input, 'package.json'))
      delete options.npmVersion
      UpdatePackage(options, () => {
        var path = Path.resolve('./bundle/programs/server/package.json')
        var json = [
          '{',
          '  "engines": {',
          `    "node": "${options.nodeVersion}",`,
          `    "npm": "${pkg.engines.npm}"`,
          '  },',
          '  "main": "../../main.js",',
          '  "scripts": {',
          '    "start": "node ../../main"',
          '  },',
          `  "test": ${options.json.test}`,
          '}'].join('\n')

        expect(fsStub.writeFile.calledWith(path, json)).to.be.true()
        done()
      })
    })
  })
})
