const EventEmitter = require('events').EventEmitter

const Code = require('code')
const Lab = require('lab')
const Proxyquire = require('proxyquire')
const Sinon = require('sinon')

const cpStub = {}
const FsStub = { access: Sinon.stub(), F_OK: 0 }

const Install = Proxyquire('../lib/install', {
  'fs': FsStub,
  './exec': cpStub
})

var lab = exports.lab = Lab.script()

var describe = lab.describe
var beforeEach = lab.beforeEach
var it = lab.it
var expect = Code.expect

describe('install', function () {
  var emitter, options

  beforeEach(function (done) {
    emitter = new EventEmitter()
    cpStub.spawn = Sinon.stub().returns(emitter)
    done()
  })

  it('exports a function', function (done) {
    expect(Install).to.be.a.function()
    done()
  })

  describe('no package.json', function () {
    beforeEach(function (done) {
      options = { input: __dirname }
      FsStub.access.yields(new Error('FS error'))
      done()
    })

    it('returns early and does not install', function (done) {
      Install(options, function (err) {
        expect(err).to.not.exist()
        expect(cpStub.spawn.called).to.be.false()
        done()
      })
    })
  })

  describe('default options', function () {
    beforeEach(function (done) {
      options = { input: __dirname }
      FsStub.access.yields()
      done()
    })

    it('installs when default options are present', function (done) {
      Install(options, function () {
        expect(cpStub.spawn.calledWith('npm', [
          'install',
          '--production'
        ])).to.be.true()
        done()
      })

      emitter.emit('close', 0)
    })
  })

  describe('exit code', function () {
    beforeEach(function (done) {
      options = { input: __dirname }
      FsStub.access.yields()
      done()
    })

    it('returns an error on failed exit', function (done) {
      Install(options, function (err) {
        expect(err.message).to.equal('NPM install failed.')
        done()
      })

      emitter.emit('close', 1)
    })

    it('returns an error when the command fails', function (done) {
      Install(options, function (err) {
        expect(err.message).to.equal('failed')
        done()
      })

      emitter.emit('error', new Error('failed'))
    })

    it('returns an error when command fails', function (done) {
      Install(options, function (err) {
        expect(err.message).to.equal('failed')
        done()
      })

      emitter.emit('error', new Error('failed'))
    })

    it('returns no error on success', function (done) {
      Install(options, function (err) {
        expect(err).to.not.exist()
        done()
      })

      emitter.emit('close', 0)
    })
  })
})
