// To run: > cd test && mocha --timeout 60000 test.js

var demeteorizer = require('../lib/demeteorizer'),
    path = require('path'),
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
        demeteorizer.convert(project, project + '_converted', 'v0.8.11', done);
      })
    })
  })
});

