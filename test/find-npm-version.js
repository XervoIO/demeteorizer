const Code = require('code')
const Lab = require('lab')
const Fs = require('fs')
const Path = require('path')
const Sinon = require('sinon')

const FindVersion = require('../lib/find-npm-version')

var lab = exports.lab = Lab.script()

var describe = lab.describe
var beforeEach = lab.beforeEach
var afterEach = lab.afterEach
var it = lab.it
var Expect = Code.expect

describe('find-npm-version', () => {
  var options

  beforeEach((done) => {
    options = {
      directory: process.env.PWD,
      input: process.env.PWD
    }

    done()
  })

  describe('when options.npmVersion is set', () => {
    it('sets npm version from --npm-version', (done) => {
      options.npmVersion = '3.10.8'
      Expect(FindVersion(options)).to.equal(options.npmVersion)
      done()
    })
  })

  describe('when setting version from options.input package.json', () => {
    it('sets npm version from bundle package.json', (done) => {
      var pkg = require(Path.resolve(options.input, 'package.json'))
      Expect(FindVersion(options)).to.equal(pkg.engines.npm)
      done()
    })
  })

  describe('when setting version to default', () => {
    var fsStub

    beforeEach((done) => {
      fsStub = Sinon.stub(Fs, 'readFileSync').returns('{}')
      done()
    })

    afterEach((done) => {
      fsStub.restore()
      done()
    })

    it('sets npm version to latest', (done) => {
      Expect(FindVersion(options)).to.equal('latest')
      done()
    })
  })

  describe('when no options are provided', () => {
    it('throws an error', (done) => {
      Expect(() => {
        FindVersion()
      }).to.throw(Error, 'options is required')

      done()
    })
  })

  describe('when fs.readFileSync throws', () => {
    var fsStub

    beforeEach((done) => {
      fsStub = Sinon.stub(Fs, 'readFileSync').throws()
      done()
    })

    afterEach((done) => {
      fsStub.restore()
      done()
    })

    it('sets npm version to latest', (done) => {
      Expect(FindVersion(options)).to.equal('latest')
      done()
    })
  })
})
