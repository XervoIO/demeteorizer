var path         = require('path');
var program      = require('commander');
var demeteorizer = require('../lib/demeteorizer');

program
  .version(require('../package.json').version)
  .option('-o, --output <path>', 'Output folder for converted application. Defaults to ./.demeteorized.')
  .option('-r, --release <version>', 'The Meteor version. Defaults to latest installed.')
  .option('-t, --tarball <path>', 'Output tarball path. If specified, creates a tar.gz of demeteorized application instead of directory.')
  .option('-a, --app_name <name>', 'Value to put in the package.json name field. Defaults to the current directory name.')
  .option('-p, --prerelease', 'Ignore Meteor prerelease warnings when running bundle.', false)
  .option('-d, --debug', 'Bundle in debug mode (don\'t minify, etc).', false)
  .parse(process.argv);

var appName    = program.app_name;
var debug      = program.debug;
var input      = process.cwd();
var output     = program.output;
var prerelease = program.prerelease;
var release    = program.release;
var tarball    = program.tarball;

output = output || path.join(process.cwd(), '.demeteorized');

console.log('Input: ', input);
console.log('Output:', output);

if (release) {
  console.log('Release:', release);
}

demeteorizer.on('progress', console.log.bind(console));

var options = {
  appName    : appName,
  debug      : debug,
  input      : input,
  output     : output,
  prerelease : prerelease,
  release    : release,
  tarball    : tarball
};

demeteorizer.convert(
  options,
  function (err) {
    if (err) {
      console.log('Demeteorization failed:', err.message);
      process.exit(1);
    } else {
      console.log('Demeteorization complete.');
    }
  }
);
