var proxyquire = require('proxyquire');
var sinon      = require('sinon');

var libStub = {};

require('../lib/demeteorizer');

describe('demeteorizer cli', function () {

  describe('initialization', function () {
    before(function () {
      libStub.on = new Function();
      libStub.convert = sinon.stub().yields(null);

      proxyquire('../lib/cli', {
        '../lib/demeteorizer': libStub
      });
    });

    it('should call convert when loaded', function () {
      libStub.convert.called.should.be.true;
    });
  });

  describe('#convert', function () {
    before(function () {
      libStub.on = new Function();
      libStub.convert = sinon.stub().yields('error');

      proxyquire('../lib/cli', {
        '../lib/demeteorizer': libStub
      });
    });

    it('should handle errors returned', function () {
      libStub.convert.called.should.be.true;
    });
  });
});
