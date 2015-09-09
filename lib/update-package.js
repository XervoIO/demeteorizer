const Fs = require('fs');
const Path = require('path');

const Hoek = require('hoek');

const FindNodeVersion = require('./find-node-version');

module.exports = function (options, done) {
  Hoek.assert(options !== undefined, 'options is required');
  Hoek.assert(Fs.existsSync(options.directory), 'Output directory not found');

  var packagePath = Path.resolve(
    options.directory,
    'bundle',
    'programs',
    'server',
    'package.json');

  //
  // Manual parsing of the package.json allows mocking of the read.
  //
  var packageContents = JSON.parse(Fs.readFileSync(packagePath));

  packageContents.engines = { node: FindNodeVersion(options) };
  packageContents.main = '../../main.js';
  packageContents.scripts = { start: 'node ../../main' };

  Hoek.merge(packageContents, options.json || {});

  //
  // Change the file permissions so we can over-write the package. Then we'll write the package
  // and then change the file permissions back to read-only.
  //
  Fs.chmodSync(packagePath, '0644') ;
  Fs.writeFile(packagePath, JSON.stringify(packageContents, null, 2), done);
};
