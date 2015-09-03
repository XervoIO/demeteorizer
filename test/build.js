const EventEmitter = require('events').EventEmitter;

const Code = require('code');
const Lab = require('lab');
const Proxyquire = require('proxyquire');
const Sinon = require('sinon');

var cpStub = {};
var Build = Proxyquire('../lib/build', {
  'child_process': cpStub
});

var lab = exports.lab = Lab.script();

var describe = lab.describe;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var it = lab.it;
var expect = Code.expect;

describe('build', function () {
  var emitter;

  beforeEach(function (done) {
    emitter = new EventEmitter();
    cpStub.spawn = Sinon.stub().returns(emitter);
    done();
  });

  it('exports a function', function (done) {
    expect(Build).to.be.a.function();
    done();
  });

  it('defaults options', function (done) {
    Build({}, function () {
      expect(cpStub.spawn.calledWith('meteor', [
        'build',
        '--server',
        'localhost',
        '--directory',
        '.demeteorized',
        '--architecture',
        'os.linux.x86_64'
      ])).to.be.true();

      done();
    });

    emitter.emit('close', 0);
  });

  it('returns an error on failed exit', function (done) {
    Build({}, function (err) {
      expect(err.message).to.equal('Conversion failed.');

      done();
    });

    emitter.emit('close', 1);
  });

  it('returns an error when the command fails', function (done) {
    Build({}, function (err) {
      expect(err.message).to.equal('failed');

      done();
    });

    emitter.emit('error', new Error('failed'));
  });
});
