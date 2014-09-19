// To run: > cd test && mocha --timeout 60000 test.js

var demeteorizer = require('../lib/demeteorizer'),
    assert = require('assert');

var projects = [
  './test-projects/leaderboard',
  './test-projects/parties',
  './test-projects/todos',
  './test-projects/wordplay'
];

demeteorizer.on('progress', function(msg) {
  console.log(msg);
});

projects.forEach(function(project) {
  describe('Demeteorizer', function() {
    describe(project, function() {
      it('should convert without error', function(done) {
        demeteorizer.convert(project, project + '_converted', 'v0.8.11', null, null, null, false, false, done);
      });
      it('should convert without error (in debug mode)', function(done) {
        demeteorizer.convert(project, project + '_debug_converted', 'v0.8.11', null, null, null, false, true, done);
      });
    });
  });
});

// Test filterDep for '0.0.0' and '0.0.0-unreleaseable'
['0.0.0','0.0.0-unreleaseable', undefined].forEach(function(ver){
  describe('Invalid Dep Version', function(){
    describe(ver, function(){
      it('should return null', function(done){
        assert(demeteorizer.filterDep('somepackage', ver) === null);
        done();
      });
    });
  });
});
