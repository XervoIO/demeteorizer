const Fs = require('fs')
const Path = require('path')

const Hoek = require('hoek')

const DEFAULT_NPM_VERSION = 'latest'

function fromPackage (options) {
  try {
    var pkg = Fs.readFileSync(Path.resolve(options.input, 'package.json'), 'utf8')
    pkg = JSON.parse(pkg)

    if (pkg.engines && pkg.engines.npm) return pkg.engines.npm
  } catch (err) {
    return false
  }
}

module.exports = (options) => {
  var version

  Hoek.assert(options !== undefined, 'options is required')

  version = options.npmVersion
  if (!version) version = fromPackage(options)

  return version || DEFAULT_NPM_VERSION
}
