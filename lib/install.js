const FS = require('fs');
const Path = require('path');
const Exec = require('./exec');

module.exports = function (options, done) {
  var pkgPath = Path.resolve(options.input, 'package.json');

  FS.access(pkgPath, FS.F_OK, function (err) {
    var args, install;

    if (err) return done();

    args = ['install', '--production'];

    install = Exec.spawn('npm', args, { cwd: options.input, stdio: 'inherit' });

    install.on('error', function (err) {
      return done(err);
    });

    install.on('close', function (code) {
      if (code !== 0) return done(new Error('NPM install failed.'));
      done();
    });
  });
};
