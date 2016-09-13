const Path = require('path');
const FS = require('fs-extra');

module.exports = function (options, done) {
  var source = Path.resolve(options.input, 'node_modules');
  var destination = Path.resolve(options.directory,
    'bundle/programs/server/node_modules'
  );

  FS.readdir(source, function (err) {
    if (err && err.code === 'ENOENT') return done();
    if (err) return done(err);

    FS.copy(source, destination, done);
  });
};
