const Fs = require('fs')
const Path = require('path')

const Hoek = require('hoek')

const DEFAULT_NODE_VERSION = '0.10.33'

module.exports = function (options) {
  var version, bootPath

  Hoek.assert(options !== undefined, 'options is required')
  Hoek.assert(Fs.existsSync(options.directory), 'Output directory not found')

  if (typeof options.nodeVersion !== 'undefined') return options.nodeVersion

  bootPath = Path.resolve(
    options.directory,
    'bundle',
    'programs',
    'server',
    'boot.js')

  try {
    // Read boot.js to find the MIN_NODE_VERSION; use that version as the node
    //    version of the project.
    Fs.readFileSync(bootPath).toString().split('\n').some(function (line) {
      if (line.indexOf('MIN_NODE_VERSION') >= 0) {
        /* eslint-disable no-magic-numbers */
        version = line.split(' ')[3].replace(/[v;']/g, '')
        /* eslint-enable no-magic-numbers */

        return true
      }
    })
  } catch (err) {
    version = DEFAULT_NODE_VERSION
  }

  return version || DEFAULT_NODE_VERSION
}
