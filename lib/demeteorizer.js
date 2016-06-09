const Hoek = require('hoek');

const Build = require('./build');
const UpdatePackage = require('./update-package');

module.exports = (options, done) => {
  Hoek.assert(options !== undefined, 'You must provide a valid options object');

  Build(options, (err) => {
    if (err) return done(err);

    UpdatePackage(options, done);
  });
};
