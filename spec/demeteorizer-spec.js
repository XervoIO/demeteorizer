var proxyquire = require('proxyquire');
var sinon      = require('sinon');

var cpStub  = {};
var fsStub  = {};

var demeteorizer = proxyquire('../lib/demeteorizer', {
  'child_process' : cpStub,
  'fs'            : fsStub,
  'rimraf'        : sinon.stub()
});

var context = { options: { input: '', output: '.demeteorized' } };

describe('demeteorizer lib', function () {

  before(function () {
    fsStub.existsSync = sinon.stub().returns(true);
  });

  it('should exist', function () {
    demeteorizer.should.be.ok;
  });

  describe('#filterDep', function () {
    it('should filter aws-sdk-browser-builder', function () {
      (demeteorizer.filterDep('aws-sdk-browser-builder', '0.0.0') === null)
        .should.be.true;
    });

    it('should filter any version with 0.0.0', function () {
      (demeteorizer.filterDep('test', '0.0.0-cats') === null)
        .should.be.true;
    });

    it('should filter undefined versions', function () {
      (demeteorizer.filterDep('test', undefined) === null)
        .should.be.true;
    });

    it('should filter nw-pre-gyp-module-test', function () {
      (demeteorizer.filterDep('nw-pre-gyp-module-test', '0.0.1') === null)
        .should.be.true;
    });

    it('should filter forge-nodejs-example', function () {
      (demeteorizer.filterDep('forge-nodejs-example', '0.0.1') === null)
        .should.be.true;
    });

    it('should fix esprima version', function () {
      var esprima = demeteorizer.filterDep('esprima', '0.0.1');

      esprima.name.should.equal('esprima');
      esprima.version.should.equal('~2.3.0');
    });

    it('should fix regenerator version', function () {
      var esprima = demeteorizer.filterDep('regenerator', '0.4.12');

      esprima.name.should.equal('regenerator');
      esprima.version.should.equal('0.x.x');
    });

    it('should fix evented version', function () {
      var esprima = demeteorizer.filterDep('evented', '1.0.0');

      esprima.name.should.equal('evented');
      esprima.version.should.equal('0.1.0');
    });

    it('should fix recast version', function () {
      var esprima = demeteorizer.filterDep('recast', '0.4.12');

      esprima.name.should.equal('recast');
      esprima.version.should.equal('0.x.x');
    });

    it('should ignore example, sample, and test packages', function () {
      (demeteorizer.filterDep('node-quickbooks-example-app') === null)
        .should.be.true;
      (demeteorizer.filterDep('node-quickbooks-sample-app') === null)
        .should.be.true;
      (demeteorizer.filterDep('NODE-QUICKBOOKS-EXAMPLE-APP') === null)
        .should.be.true;
      (demeteorizer.filterDep('NODE-QUICKBOOKS-SAMPLE-APP') === null)
        .should.be.true;
      (demeteorizer.filterDep('node-quickbooks-test-app') === null)
        .should.be.true;
      (demeteorizer.filterDep('NODE-QUICKBOOKS-TEST-APP') === null)
        .should.be.true;
    });
  });

  describe('#getMeteorVersion', function () {
    it('should get the correct meteor version', function () {
      cpStub.exec = sinon.stub().yields(null, 'Meteor 0.9.9.2\n', '');

      demeteorizer.getMeteorVersion(context, function () {
        context.meteorVersion.should.equal('0.9.x');
        context.isWindows.should.be.false;
      });
    });

    it('should get the correct meteor version when extra output is present', function () {
      var out =
        'loading observatory: apollo\nloading observatory: galileo\nMeteor 0.9.2.2\n';
      cpStub.exec = sinon.stub().yields(null, out, '');

      demeteorizer.getMeteorVersion(context, function () {
        context.meteorVersion.should.equal('0.9.x');
        context.isWindows.should.be.false;
      });
    });

    it('should return an error if meteor is not installed', function (done) {
      cpStub.exec = sinon.stub().yields(null, '');

      demeteorizer.getMeteorVersion(context, function (err) {
        err.should.be.ok;
        err.message.should.equal(
          'Could not determine Meteor version. Make sure that Meteor is installed.'
        );
        done();
      });
    });

    it('should get the correct version for Windows preview', function () {
      cpStub.exec = sinon.stub().yields(null, 'WINDOWS-PREVIEW@0.3.0');

      demeteorizer.getMeteorVersion(context, function () {
        context.meteorVersion.should.equal('0.3.x');
        context.isWindows.should.be.true;
      });
    });

    it('should set windows boolean for Windows preview', function () {
      cpStub.exec = sinon.stub().yields(null, 'WINDOWS-PREVIEW@0.3.0');

      demeteorizer.getMeteorVersion(context, function () {
        context.meteorVersion.should.equal('0.3.x');
        context.isWindows.should.be.true;
      });
    });

    it('should return an error if meteor exits with error code', function (done) {
      cpStub.exec = sinon.stub().yields(new Error('Failed.'));

      demeteorizer.getMeteorVersion(context, function (err) {
        err.should.be.ok;
        err.message.should.equal(
          'Failed.'
        );
        done();
      });
    });
  });

  describe('#createTarball', function () {
    it('should execute the correct command', function (done) {
      context.options.tarball = 'test.tar.gz';
      cpStub.exec = sinon.stub().yields(null);

      demeteorizer.createTarball(context, function () {
        cpStub.exec
          .calledWith('tar czPf test.tar.gz -C .demeteorized .')
          .should.be.true;

        done();
      });
    });
  });

  describe('#getBundleCommand', function () {
    it('should choose meteor bundle for 0.9.x', function () {
      context.meteorVersion = '0.9.x';
      context.isWindows = false;

      demeteorizer.getBundleCommand(context).should.equal('meteor');
    });

    it('should choose mrt bundle for 0.8.x', function () {
      context.meteorVersion = '0.8.x';
      context.isWindows = false;

      demeteorizer.getBundleCommand(context).should.equal('mrt');
    });

    it('should choose meteor bundle for invalid versions', function () {
      context.meteorVersion = '1.0-rc.10';
      context.isWindows = false;

      demeteorizer.getBundleCommand(context).should.equal('meteor');
    });

    it('should choose meteor bundle for windows preview', function () {
      context.meteorVersion = '0.3.x';
      context.isWindows = true;

      demeteorizer.getBundleCommand(context).should.equal('meteor');
    });
  });

  describe('#bundle', function () {
    it('should execute with the correct options', function () {
      context.options.output  = '.demeteorized';
      context.options.release = '0.9.x';
      context.options.debug   = true;

      cpStub.exec = sinon.spy();

      demeteorizer.bundle(context, function () {
        cpStub.exec
          .calledWith('cd  && mrt bundle --debug --release 0.9.x --directory .demeteorized')
          .should.be.true;
      });
    });
  });

  describe('#setupPaths', function () {
    it('should correctly configure paths', function () {
      var test = demeteorizer.setupPaths(context.options);

      test.node_modules.should
        .equal('.demeteorized/programs/server/node_modules');
      test.old_node_modules.should
        .equal('.demeteorized/server/node_modules');
      test.old_server.should
        .equal('.demeteorized/server/server.js');
      test.package_json.should
        .equal('.demeteorized/package.json');
      test.server.should
        .equal('.demeteorized/programs/server/boot.js');
    });
  });

  describe('#createPackageJSON', function () {
    before(function () {
      context.paths = {};
      context.paths.package_json = './package.json';
    });

    it('should create package.json with the correct node version', function () {
      fsStub.readFileSync =
        sinon.stub().returns('var MIN_NODE_VERSION = \'v0.12.0\';');

      fsStub.writeFileSync = function (path, data) {
        path.should.equal('./package.json');
        JSON.parse(data).engines.node.should.exist;
        JSON.parse(data).engines.node.should.equal('0.12.0');
      };

      demeteorizer.createPackageJSON(context, new Function());
    });

    it('should default the node version if version not found boot.js', function () {
      fsStub.readFileSync =
        sinon.stub().returns('');

      fsStub.writeFileSync = function (path, data) {
        path.should.equal('./package.json');
        JSON.parse(data).engines.node.should.exist;
        JSON.parse(data).engines.node.should.equal('0.10.33');
      };

      demeteorizer.createPackageJSON(context, new Function());
    });

    it('should default the node version if boot.js parse fails', function () {
      fsStub.readFileSync = function () { throw new Error('ENOENT'); };

      fsStub.writeFileSync = function (path, data) {
        path.should.equal('./package.json');
        JSON.parse(data).engines.node.should.exist;
        JSON.parse(data).engines.node.should.equal('0.10.33');
      };

      demeteorizer.createPackageJSON(context, new Function());
    });
  });
});
