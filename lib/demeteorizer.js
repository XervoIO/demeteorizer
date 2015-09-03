const Hoek = require('hoek');

const Build = require('./build');
const UpdatePackage = require('./update-package');

exports.convert = function (options) {
  Hoek.assert(options !== undefined, 'You must provide a valid options object');

  Build(options, function (err) {
    if (err) {
      console.error(err.message);
      return process.exit(1);
    }

    UpdatePackage(options, function (err) {
      if (err) {
        console.error(err.message);
        return process.exit(1);
      }

      console.log('Demeteorization complete.');
    });
  });
}
