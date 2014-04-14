var program = require('commander'),
    demeteorizer = require('../lib/demeteorizer'),
    path = require('path');

program
  .version(require('../package.json').version)
  .option('-o, --output <path>', 'Output folder for converted application. Defaults to ./.demeteorized.')
  .option('-n, --node_version <version>', 'The required version of node [v0.10.25].', 'v0.10.25')
  .option('-r, --release <version>', 'The Meteor version. Defaults to latest installed.')
  .option('-t, --tarball <path>', 'Output tarball path. If specified, creates a tar.gz of demeteorized application instead of directory.')
  .option('-a, --app_name <name>', 'Value to put in the package.json name field. Defaults to the current directory name.')
  .option('-p, --prerelease', 'Ignore Meteor prerelease warnings when running bundle.', false)
  .parse(process.argv);

var output = program.output;
var node_version = program.node_version;
var release = program.release;
var tarball = program.tarball;
var appName = program.app_name;
var prerelease = program.prerelease;

var input = process.cwd();

if(!output) {
  output = path.join(process.cwd(), '.demeteorized');
}

if(node_version.indexOf('v') !== 0) {
  node_version = 'v' + node_version;
}

console.log('Input: ' + input);
console.log('Output: ' + output);
if(release) {
  console.log('Release: ' + release);
}

demeteorizer.on('progress', function(msg) {
  console.log(msg);
});

demeteorizer.convert(input, output, node_version, release, tarball, appName, prerelease, function(err) {
  if(err) {
    console.log('ERROR: ' + err);
  }
  else {
    console.log('Demeteorization complete.');
  }
});
