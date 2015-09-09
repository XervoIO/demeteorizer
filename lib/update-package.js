const Fs = require('fs');
const Path = require('path');

const Hoek = require('hoek');

const FindNodeVersion = require('./find-node-version');

module.exports = function (options, done) {
  var packagePath, packageContents;

  Hoek.assert(options !== undefined, 'options is required');
  Hoek.assert(Fs.existsSync(options.directory), 'Output directory not found');

  packagePath = Path.resolve(
    options.directory,
    'bundle',
    'programs',
    'server',
    'package.json');

  //
  // Manual parsing of the package.json allows mocking of the read.
  //
  packageContents = JSON.parse(Fs.readFileSync(packagePath));

  packageContents.engines = { node: FindNodeVersion(options) };
  packageContents.main = '../../main.js';
  packageContents.scripts = { start: 'node ../../main' };

  Hoek.merge(packageContents, options.json || {});

  Fs.chmodSync(packagePath, '0644');
  Fs.writeFile(packagePath, JSON.stringify(packageContents, null, 2), done);
};
