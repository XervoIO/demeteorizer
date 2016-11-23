const Code = require('code')
const Lab = require('lab')
const Proxyquire = require('proxyquire')
const Sinon = require('sinon')
const Path = require('path')

var fsStub = {
  readFileSync: Sinon.stub(),
  existsSync: Sinon.stub()
}
var FindVersion = Proxyquire('../lib/find-node-version', {
  'fs': fsStub
})

var lab = exports.lab = Lab.script()

var describe = lab.describe
var beforeEach = lab.beforeEach
var afterEach = lab.afterEach
var it = lab.it
var expect = Code.expect

describe('find-node-version', () => {
  var options

  beforeEach((done) => {
    options = {
      directory: process.env.PWD,
      nodeVersion: '4.2.0',
      input: process.env.PWD
    }

    done()
  })

  afterEach((done) => {
    fsStub.existsSync.reset()
    fsStub.readFileSync.reset()
    done()
  })

  describe('initialization', () => {
    beforeEach((done) => {
      fsStub.existsSync.returns(false)
      done()
    })

    it('fails if no options object is provided', (done) => {
      expect(() => {
        FindVersion()
      }).to.throw()

      done()
    })

    it('fails if output directory does not exist', (done) => {
      delete options.output
      expect(() => {
        FindVersion(options)
      }).to.throw()

      done()
    })
  })

  describe('successfully', () => {
    beforeEach((done) => {
      fsStub.existsSync = Sinon.stub().returns(true)
      fsStub.readFileSync.onCall(0).returns(JSON.stringify({ 'engines': {} }))
      fsStub.readFileSync.onCall(1).returns([
        'var Fiber = require("fibers");',
        'var fs = require("fs");',
        'var path = require("path");',
        'var Future = require("fibers/future");',
        'var _ = require(\'underscore\');',
        'var sourcemap_support = require(\'source-map-support\');',
        '',
        'var bootUtils = require(\'./boot-utils.js\');',
        'var files = require(\'./mini-files.js\');',
        '',
        '// This code is duplicated in tools/main.js.',
        'var MIN_NODE_VERSION = \'v0.10.36\';'
      ].join('\n'))
      done()
    })

    it('sets node version from --node-version', (done) => {
      expect(FindVersion(options))
        .to.equal('4.2.0')
      done()
    })

    describe('setting node version from options.input package.json', () => {
      var pkg

      beforeEach((done) => {
        pkg = require(Path.resolve(options.input, 'package.json'))
        fsStub.readFileSync.onCall(0).returns(JSON.stringify(pkg))
        done()
      })

      it('finds node version in engines block', (done) => {
        delete options.nodeVersion
        expect(FindVersion(options)).to.equal(pkg.engines.node)
        done()
      })
    })

    it('finds the node version from boot.js', (done) => {
      delete options.nodeVersion
      expect(FindVersion(options)).to.equal('0.10.36')
      done()
    })
  })

  describe('unsuccessfully', () => {
    beforeEach((done) => {
      fsStub.existsSync.returns(true)
      fsStub.readFileSync.onCall(0).returns(JSON.stringify({}))
      fsStub.readFileSync.onCall(1).returns('')
      done()
    })

    it('finds the node version from boot.js', (done) => {
      delete options.nodeVersion
      expect(FindVersion(options)).to.equal('0.10.33')
      done()
    })
  })

  describe('throws trying to', () => {
    beforeEach((done) => {
      fsStub.existsSync = Sinon.stub().returns(true)
      fsStub.readFileSync.onCall(0).throws()
      fsStub.readFileSync.onCall(1).throws()
      done()
    })

    it('find the node version from boot.js', (done) => {
      delete options.nodeVersion
      expect(FindVersion(options)).to.equal('0.10.33')
      done()
    })
  })
})
