const Hoek = require('hoek')

const Build = require('./build')
const Install = require('./install')
const CopyDependencies = require('./copy-dependencies')
const UpdatePackage = require('./update-package')

module.exports = (options, done) => {
  Hoek.assert(options !== undefined, 'You must provide a valid options object')

  Install(options, (err) => {
    if (err) return done(err)

    Build(options, (err) => {
      if (err) return done(err)

      CopyDependencies(options, (err) => {
        if (err) return done(err)

        UpdatePackage(options, done)
      })
    })
  })
}
