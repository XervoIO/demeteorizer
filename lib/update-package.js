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
  // The generated package.json is read-only, but removing it prior to writing
  //    will allow updates.
  //
  // Node 0.10.xx + Windows Hack .. Windows does not allow an unlink of a Read-Only file .. 
  // So we chmod it to be rw by owner... 
  // This was fixed in node 0.12 + but still is an issue in 0.10.XX which Meteor uses..
  if ( FindNodeVersion(options).substring(0,4) === "0.10" && process.platform === "win32") {
  	Fs.chmodSync( packagePath, "0644") ;
  }

  Fs.unlinkSync(packagePath);
  Fs.writeFile(packagePath, JSON.stringify(packageContents, null, 2), done);
};
