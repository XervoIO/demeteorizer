const EventEmitter = require('events').EventEmitter

const Code = require('code')
const Lab = require('lab')
const Proxyquire = require('proxyquire')
const Sinon = require('sinon')

var cpStub = {}
var Build = Proxyquire('../lib/build', {
  './exec': cpStub
})

var lab = exports.lab = Lab.script()

var describe = lab.describe
var beforeEach = lab.beforeEach
var it = lab.it
var expect = Code.expect

describe('build', () => {
  var emitter

  beforeEach((done) => {
    emitter = new EventEmitter()
    cpStub.spawn = Sinon.stub().returns(emitter)
    done()
  })

  it('exports a function', (done) => {
    expect(Build).to.be.a.function()
    done()
  })

  it('defaults options', (done) => {
    Build({}, () => {
      expect(cpStub.spawn.calledWith('meteor', [
        'build',
        '--server',
        'localhost:3000',
        '--directory',
        '.demeteorized'
      ])).to.be.true()

      done()
    })

    emitter.emit('close', 0)
  })

  it('overrides architecture when provided', (done) => {
    Build({ architecture: 'os.linux.x86_64' }, () => {
      expect(cpStub.spawn.calledWith('meteor', [
        'build',
        '--server',
        'localhost:3000',
        '--directory',
        '.demeteorized',
        '--architecture',
        'os.linux.x86_64'
      ])).to.be.true()

      done()
    })

    emitter.emit('close', 0)
  })

  it('includes debug when provided', (done) => {
    Build({ debug: true }, () => {
      expect(cpStub.spawn.calledWith('meteor', [
        'build',
        '--server',
        'localhost:3000',
        '--directory',
        '.demeteorized',
        '--debug'
      ])).to.be.true()

      done()
    })

    emitter.emit('close', 0)
  })

  it('includes server only when provided', (done) => {
    Build({ serverOnly: true }, () => {
      expect(cpStub.spawn.calledWith('meteor', [
        'build',
        '--server',
        'localhost:3000',
        '--directory',
        '.demeteorized',
        '--server-only'
      ])).to.be.true()

      done()
    })

    emitter.emit('close', 0)
  })

  it('includes verbose when provided', (done) => {
    Build({ verbose: true }, () => {
      expect(cpStub.spawn.calledWith('meteor', [
        'build',
        '--server',
        'localhost:3000',
        '--directory',
        '.demeteorized',
        '--verbose'
      ])).to.be.true()

      done()
    })

    emitter.emit('close', 0)
  })

  it('overrides server when provided', (done) => {
    Build({ server: 'http://example.com' }, () => {
      expect(cpStub.spawn.calledWith('meteor', [
        'build',
        '--server',
        'http://example.com',
        '--directory',
        '.demeteorized'
      ])).to.be.true()

      done()
    })

    emitter.emit('close', 0)
  })

  it('returns an error on failed exit', (done) => {
    Build({}, (err) => {
      expect(err.message).to.equal('Conversion failed.')

      done()
    })

    emitter.emit('close', 1)
  })

  it('returns an error when the command fails', (done) => {
    Build({}, (err) => {
      expect(err.message).to.equal('failed')

      done()
    })

    emitter.emit('error', new Error('failed'))
  })

  it('return clear error message when Meteor not installed', function (done) {
    Build({}, function (err) {
      expect(err.message).to.include('Meteor not in $PATH')
      done()
    })

    emitter.emit('error', { code: 'ENOENT' })
  })
})
