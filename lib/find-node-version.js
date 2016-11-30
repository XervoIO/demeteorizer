const Fs = require('fs')
const Path = require('path')

const Hoek = require('hoek')

const DEFAULT_NODE_VERSION = '0.10.33'

function fromPackage (options) {
  try {
    var pkg = Fs.readFileSync(Path.resolve(options.input, 'package.json'), 'utf8')
    pkg = JSON.parse(pkg)

    if (pkg.engines && pkg.engines.node) return pkg.engines.node
  } catch (err) {
    return false
  }
}

// Read boot.js to find the MIN_NODE_VERSION
function fromBoot (options) {
  var version
  var bootPath = Path.resolve(
    options.directory,
    'bundle',
    'programs',
    'server',
    'boot.js')

  try {
    version = Fs.readFileSync(bootPath, 'utf8')
      .split('\n')
      .find((line) => line.indexOf('MIN_NODE_VERSION') >= 0)
      .split(' ')[3] // eslint-disable no-magic-numbers
      .replace(/[v;']/g, '')
  } catch (err) {
    return false
  }
  return version
}

module.exports = (options) => {
  var version

  Hoek.assert(options !== undefined, 'options is required')
  Hoek.assert(Fs.existsSync(options.directory), 'Output directory not found')

  version = options.nodeVersion
  if (!version) version = fromPackage(options)
  if (!version) version = fromBoot(options)

  return version || DEFAULT_NODE_VERSION
}
