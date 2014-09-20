var program = require('commander'),
    demeteorizer = require('../lib/demeteorizer'),
    path = require('path');

program
  .version(require('../package.json').version)
  .option('-o, --output <path>', 'Output folder for converted application. Defaults to ./.demeteorized.')
  .option('-r, --release <version>', 'The Meteor version. Defaults to latest installed.')
  .option('-t, --tarball <path>', 'Output tarball path. If specified, creates a tar.gz of demeteorized application instead of directory.')
  .option('-a, --app_name <name>', 'Value to put in the package.json name field. Defaults to the current directory name.')
  .option('-p, --prerelease', 'Ignore Meteor prerelease warnings when running bundle.', false)
  .option('-d, --debug', 'Bundle in debug mode (don\'t minify, etc).', false)
  .parse(process.argv);

var output = program.output;
var release = program.release;
var tarball = program.tarball;
var appName = program.app_name;
var prerelease = program.prerelease;
var debug = program.debug;

var input = process.cwd();

if(!output) {
  output = path.join(process.cwd(), '.demeteorized');
}

console.log('Input: ' + input);
console.log('Output: ' + output);
if(release) {
  console.log('Release: ' + release);
}

demeteorizer.on('progress', function(msg) {
  console.log(msg);
});

var options = {
  input: input, 
  output: output,
  release: release,
  tarball: tarball,
  appName: appName,
  prerelease: prerelease, 
  debug: debug 
};

demeteorizer.convert(
  options,
  function(err) {
    if(err) {
      console.log('ERROR: ' + err);
      process.exit(1);
    }
    else {
      console.log('Demeteorization complete.');
    }
  }
);
