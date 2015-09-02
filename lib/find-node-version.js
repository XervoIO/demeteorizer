const Fs = require('fs');
const Hoek = require('hoek');
const Path = require('path');

const DEFAULT_NODE_VERSION = '0.10.33';

module.exports = function (options) {
  Hoek.assert(options !== undefined, 'options is required');
  Hoek.assert(Fs.existsSync(options.directory), 'Output directory not found');

  var version = '';
  var bootPath = Path.resolve(
    options.directory,
    'bundle',
    'programs',
    'server',
    'boot.js');

  try {
    // Read boot.js to find the MIN_NODE_VERSION; use that version as the node
    //    version of the project.
    Fs.readFileSync(bootPath).toString().split('\n').some(function (line) {
      if (line.indexOf('MIN_NODE_VERSION') >= 0) {
        version = line.split(' ')[3].replace(/[v;']/g, '');
        return true;
      }
    });
  } catch (err) {
    version = DEFAULT_NODE_VERSION;
  }

  return version || DEFAULT_NODE_VERSION;
};
