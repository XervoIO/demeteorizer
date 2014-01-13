var program = require('commander'),
    demeteorizer = require('../lib/demeteorizer'),
    path = require('path');

program
  .version(require('../package.json').version)
  .option('-o, --output <path>', 'Output folder for converted application. Defaults to ./.demeteorized')
  .option('-n, --node_version <version>', 'The required version of node [v0.10.22]', 'v0.10.22')
  .option('-r, --release <version>', 'Sets the Meteor version. Defaults to latest installed.')
  .option('-t  --tarball', 'Creates a tarball instead of a directory containing the converted application')
  .parse(process.argv);

var output = program.output;
var node_version = program.node_version;
var release = program.release;
var tarball = program.tarball;

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

demeteorizer.convert(input, output, node_version, release, tarball, function(err) {
  if(err) {
    console.log('ERROR: ' + err);
  }
  else {
    console.log('Demeteorization complete.');
  }
});
