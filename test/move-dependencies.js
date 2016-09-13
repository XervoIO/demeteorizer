const Path = require('path');
const Code = require('code');
const Lab = require('lab');
const Proxyquire = require('proxyquire');
const Sinon = require('sinon');

const FsStub = { readdir: Sinon.stub(), copy: Sinon.stub() };
const MoveDependencies = Proxyquire('../lib/move-dependencies', {
  'fs-extra': FsStub
});

var lab = exports.lab = Lab.script();

var describe = lab.describe;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var it = lab.it;
var expect = Code.expect;

describe('move-dependencies', function () {
  var directory = Path.resolve(__dirname, '.demeteorized');
  var options = { input: __dirname, directory: directory };

  beforeEach(function (done) {
    done();
  });

  afterEach(function (done) {
    FsStub.readdir.reset();
    FsStub.copy.reset();
    done();
  });

  it('exports a function', function (done) {
    expect(MoveDependencies).to.be.a.function();
    done();
  });

  describe('node_modules directory', function () {
    describe('directory does not exist', function () {
      beforeEach(function (done) {
        FsStub.readdir.yields({ code: 'ENOENT' });
        done();
      });

      it('exists early when directory does not exist', function (done) {
        MoveDependencies(options, function (err) {
          expect(err).to.not.exist();
          expect(FsStub.copy.called).to.be.false();
          done();
        });
      });
    });

    describe('error reading directory', function () {
      beforeEach(function (done) {
        FsStub.readdir.yields(new Error('fs error'));
        done();
      });

      it('returns error when reading node_modules directory', function (done) {
        MoveDependencies(options, function (err) {
          expect(err.message).to.equal('fs error');
          expect(FsStub.copy.called).to.be.false();
          done();
        });
      });
    });

    describe('copying directory', function () {
      beforeEach(function (done) {
        FsStub.readdir.yields();
        FsStub.copy.yields();
        done();
      });

      it('copies node_modules into demeteorized application', function (done) {
        var source = Path.resolve(options.input, 'node_modules');
        var destination = Path.resolve(options.directory,
          'bundle/programs/server/node_modules'
        );

        MoveDependencies(options, function (err) {
          expect(err).to.not.exist();
          expect(FsStub.copy.calledWith(source, destination)).to.be.true();
          done();
        });
      });
    });
  });
});
