const ChildProcess = require('child_process');

const Hoek = require('hoek');
const Util = require('util');

const defaults = {
  server: 'localhost',
  directory: '.demeteorized'
};

//
// Options include:
//    server - URL of the server (defaults to localhost).
//    directory - The output directory (defaults to .demeteorized).
//    architecture - Architecture build target.
//
module.exports = function (options, done) {
  options = Hoek.applyToDefaults(defaults, options);
  var args = [
    'build',
    '--server', options.server,
    '--directory', Util.format('%s', options.directory)
  ];

  if (options.architecture) {
    args.push('--architecture');
    args.push(options.architecture);
  }

  if (options.debug) args.push('--debug');

  var build = ChildProcess.spawn('meteor', args, { cwd: options.input, stdio: 'inherit' });

  build.on('error', function (err) {
    done(err);
  });

  build.on('close', function (code) {
    if (code !== 0) return done(new Error('Conversion failed.'));
    done();
  });
};
