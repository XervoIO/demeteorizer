var Code = require('code');
var Lab = require('lab');
var proxyquire = require('proxyquire');
var sinon = require('sinon');

var cpStub = {};
var fsStub = {};

var lab = exports.lab = Lab.script();

var describe = lab.describe;
var before = lab.before;
var it = lab.it;
var expect = Code.expect;

var demeteorizer = proxyquire('../lib/demeteorizer', {
  'child_process': cpStub,
  'fs': fsStub,
  'rimraf': sinon.stub()
});

var context = { options: { input: '', output: '.demeteorized' } };

describe('demeteorizer lib', function () {

  before(function (done) {
    fsStub.existsSync = sinon.stub().returns(true);
    done();
  });

  it('should exist', function (done) {
    expect(demeteorizer).to.exist();
    done();
  });

  describe('#filterDep', function () {
    it('should filter aws-sdk-browser-builder', function (done) {
      expect(demeteorizer.filterDep('aws-sdk-browser-builder', '0.0.0')).to.equal(null);
      done();
    });

    it('should filter any version with 0.0.0', function (done) {
      expect(demeteorizer.filterDep('test', '0.0.0-cats')).to.equal(null);
      done();
    });

    it('should filter undefined versions', function (done) {
      expect(demeteorizer.filterDep('test', undefined)).to.equal(null);
      done();
    });

    it('should filter nw-pre-gyp-module-test', function (done) {
      expect(demeteorizer.filterDep('nw-pre-gyp-module-test', '0.0.1')).to.equal(null);
      done();
    });

    it('should filter forge-nodejs-example', function (done) {
      expect(demeteorizer.filterDep('forge-nodejs-example', '0.0.1')).to.equal(null);
      done();
    });

    it('should fix esprima version', function (done) {
      var esprima = demeteorizer.filterDep('esprima', '0.0.1');

      expect(esprima.name).to.equal('esprima');
      expect(esprima.version).to.equal('~2.3.0');
      done();
    });

    it('should fix regenerator version', function (done) {
      var regenerator = demeteorizer.filterDep('regenerator', '0.4.12');

      expect(regenerator.name).to.equal('regenerator');
      expect(regenerator.version).to.equal('0.x.x');
      done();
    });

    it('should fix evented version', function (done) {
      var evented = demeteorizer.filterDep('evented', '1.0.0');

      expect(evented.name).to.equal('evented');
      expect(evented.version).to.equal('0.1.0');
      done();
    });

    it('should fix recast version', function (done) {
      var recast = demeteorizer.filterDep('recast', '0.4.12');

      expect(recast.name).to.equal('recast');
      expect(recast.version).to.equal('0.x.x');
      done();
    });

    it('should correct registry links', function (done) {
      var stripe = demeteorizer.filterDep(
        'stripe',
        'https://registry.beneaththeink.com/stripe/-/stripe-3.0.3.tgz');

      expect(stripe.name).to.equal('stripe');
      expect(stripe.version).to.equal('https://registry.npmjs.com/stripe/-/stripe-3.0.3.tgz');
      done()
    });

    it('should ignore example, sample, and test packages', function (done) {
      expect(demeteorizer.filterDep('node-quickbooks-example-app')).to.equal(null);
      expect(demeteorizer.filterDep('node-quickbooks-sample-app')).to.equal(null);
      expect(demeteorizer.filterDep('NODE-QUICKBOOKS-EXAMPLE-APP')).to.equal(null);
      expect(demeteorizer.filterDep('NODE-QUICKBOOKS-SAMPLE-APP')).to.equal(null);
      expect(demeteorizer.filterDep('node-quickbooks-test-app')).to.equal(null);
      expect(demeteorizer.filterDep('NODE-QUICKBOOKS-TEST-APP')).to.equal(null);
      done();
    });
  });

  describe('#getMeteorVersion', function () {
    it('should get the correct meteor version', function (done) {
      cpStub.exec = sinon.stub().yields(null, 'Meteor 0.9.9.2\n', '');

      demeteorizer.getMeteorVersion(context, function () {
        expect(context.meteorVersion).to.equal('0.9.x');
        expect(context.isWindows).to.equal(false);

        done();
      });
    });

    it('should get the correct meteor version when extra output is present', function (done) {
      var out =
        'loading observatory: apollo\nloading observatory: galileo\nMeteor 0.9.2.2\n';
      cpStub.exec = sinon.stub().yields(null, out, '');

      demeteorizer.getMeteorVersion(context, function () {
        expect(context.meteorVersion).to.equal('0.9.x');
        expect(context.isWindows).to.equal(false);

        done();
      });
    });

    it('should return an error if meteor is not installed', function (done) {
      cpStub.exec = sinon.stub().yields(null, '');

      demeteorizer.getMeteorVersion(context, function (err) {
        expect(err).to.exist();
        expect(err.message).to.equal(
          'Could not determine Meteor version. Make sure that Meteor is installed.'
        );

        done();
      });
    });

    it('should get the correct version for Windows preview', function (done) {
      cpStub.exec = sinon.stub().yields(null, 'WINDOWS-PREVIEW@0.3.0');

      demeteorizer.getMeteorVersion(context, function () {
        expect(context.meteorVersion).to.equal('0.3.x');
        expect(context.isWindows).to.equal(true);

        done();
      });
    });

    it('should set windows boolean for Windows preview', function (done) {
      cpStub.exec = sinon.stub().yields(null, 'WINDOWS-PREVIEW@0.3.0');

      demeteorizer.getMeteorVersion(context, function () {
        expect(context.meteorVersion).to.equal('0.3.x');
        expect(context.isWindows).to.equal(true);

        done();
      });
    });

    it('should return an error if meteor exits with error code', function (done) {
      cpStub.exec = sinon.stub().yields(new Error('Failed.'));

      demeteorizer.getMeteorVersion(context, function (err) {
        expect(err).to.exist()
        expect(err.message).to.equal('Failed.');

        done();
      });
    });
  });

  describe('#createTarball', function () {
    it('should execute the correct command', function (done) {
      context.options.tarball = 'test.tar.gz';
      cpStub.exec = sinon.stub().yields(null);

      demeteorizer.createTarball(context, function () {
        expect(cpStub.exec.calledWith('tar czPf "test.tar.gz" -C ".demeteorized" .'))
          .to.equal(true);

        done();
      });
    });
  });

  describe('#getBundleCommand', function () {
    it('should choose meteor bundle for 0.9.x', function (done) {
      context.meteorVersion = '0.9.x';
      context.isWindows = false;

      expect(demeteorizer.getBundleCommand(context)).to.equal('meteor');
      done();
    });

    it('should choose mrt bundle for 0.8.x', function (done) {
      context.meteorVersion = '0.8.x';
      context.isWindows = false;

      expect(demeteorizer.getBundleCommand(context)).to.equal('mrt');
      done();
    });

    it('should choose meteor bundle for invalid versions', function (done) {
      context.meteorVersion = '1.0-rc.10';
      context.isWindows = false;

      expect(demeteorizer.getBundleCommand(context)).to.equal('meteor');
      done();
    });

    it('should choose meteor bundle for windows preview', function (done) {
      context.meteorVersion = '0.3.x';
      context.isWindows = true;

      expect(demeteorizer.getBundleCommand(context)).to.equal('meteor');
      done();
    });
  });

  describe('#bundle', function () {
    it('should execute with the correct options', function (done) {
      context.options.output  = '.demeteorized';
      context.options.release = '0.9.x';
      context.options.debug   = true;

      cpStub.exec = sinon.stub().yields(null);

      demeteorizer.bundle(context, function () {
        expect(
          cpStub.exec
          .calledWith('cd "" && meteor bundle --debug --release 0.9.x --directory ".demeteorized"')
        ).to.equal(true);

        done();
      });
    });
  });

  describe('#setupPaths', function () {
    it('should correctly configure paths', function (done) {
      var test = demeteorizer.setupPaths(context.options);

      expect(test.node_modules).to.equal('.demeteorized/programs/server/node_modules');
      expect(test.old_node_modules).to.equal('.demeteorized/server/node_modules');
      expect(test.old_server).to.equal('.demeteorized/server/server.js');
      expect(test.package_json).to.equal('.demeteorized/package.json');
      expect(test.server).to.equal('.demeteorized/programs/server/boot.js');
      done();
    });
  });

  describe('#createPackageJSON', function () {
    before(function (done) {
      context.paths = {};
      context.json = {};
      context.paths.package_json = './package.json';
      done();
    });

    it('should create package.json with the correct node version', function (done) {
      fsStub.readFileSync =
        sinon.stub().returns('var MIN_NODE_VERSION = \'v0.12.0\';');

      fsStub.writeFileSync = function (path, data) {
        expect(path).to.equal('./package.json');
        expect(JSON.parse(data).engines.node).to.exist();
        expect(JSON.parse(data).engines.node).to.equal('0.12.0');

        done();
      };

      demeteorizer.createPackageJSON(context, new Function());
    });

    it('should default the node version if version not found boot.js', function (done) {
      fsStub.readFileSync = sinon.stub().returns('');

      fsStub.writeFileSync = function (path, data) {
        expect(path).to.equal('./package.json');
        expect(JSON.parse(data).engines.node).to.exist();
        expect(JSON.parse(data).engines.node).to.equal('0.10.33');

        done();
      };

      demeteorizer.createPackageJSON(context, new Function());
    });

    it('should default the node version if boot.js parse fails', function (done) {
      fsStub.readFileSync = function () { throw new Error('ENOENT'); };

      fsStub.writeFileSync = function (path, data) {
        expect(path).to.equal('./package.json');
        expect(JSON.parse(data).engines.node).to.exist();
        expect(JSON.parse(data).engines.node).to.equal('0.10.33');

        done();
      };

      demeteorizer.createPackageJSON(context, new Function());
    });

    it('should include arbitrary JSON data', function (done) {
      context.json = {
        test: true,
        inner: { deep: true },
        engines: { node: '0.12.x' }
      };

      fsStub.readFileSync = sinon.stub().returns('');

      fsStub.writeFileSync = function (path, data) {
        expect(path).to.equal('./package.json');
        expect(JSON.parse(data).engines.node).to.exist();
        expect(JSON.parse(data).engines.node).to.equal('0.12.x');
        expect(JSON.parse(data).test).to.equal(true);
        expect(JSON.parse(data).inner.deep).to.equal(true);

        done();
      };

      demeteorizer.createPackageJSON(context, new Function());
    });
  });
});
