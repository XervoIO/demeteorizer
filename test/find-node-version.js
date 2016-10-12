const Code = require('code')
const Lab = require('lab')
const Proxyquire = require('proxyquire')
const Sinon = require('sinon')

var fsStub = {}
var FindVersion = Proxyquire('../lib/find-node-version', {
  fs: fsStub
})

var lab = exports.lab = Lab.script()

var describe = lab.describe
var before = lab.beforeEach
var it = lab.it
var expect = Code.expect

describe('find-node-version', () => {
  describe('initialization', () => {
    it('fails if no options object is provided', (done) => {
      expect(() => {
        FindVersion()
      }).to.throw()

      done()
    })

    before((done) => {
      fsStub.existsSync = Sinon.stub().returns(false)
      done()
    })

    it('fails if output directory does not exist', (done) => {
      expect(() => {
        FindVersion({ directory: '' })
      }).to.throw()

      done()
    })
  })

  describe('successfully', () => {
    before((done) => {
      fsStub.existsSync = Sinon.stub().returns(true)
      fsStub.readFileSync = Sinon.stub().returns([
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
      expect(FindVersion({ directory: '', nodeVersion: '4.2.0' }))
        .to.equal('4.2.0')
      done()
    })

    it('finds the node version from boot.js', (done) => {
      expect(FindVersion({ directory: '' })).to.equal('0.10.36')
      done()
    })
  })

  describe('unsuccessfully', () => {
    before((done) => {
      fsStub.existsSync = Sinon.stub().returns(true)
      fsStub.readFileSync = Sinon.stub().returns('')
      done()
    })

    it('finds the node version from boot.js', (done) => {
      expect(FindVersion({ directory: '' })).to.equal('0.10.33')
      done()
    })
  })

  describe('throws trying to', () => {
    before((done) => {
      fsStub.existsSync = Sinon.stub().returns(true)
      fsStub.readFileSync = Sinon.stub().throws()
      done()
    })

    it('find the node version from boot.js', (done) => {
      expect(FindVersion({ directory: '' })).to.equal('0.10.33')
      done()
    })
  })
})
