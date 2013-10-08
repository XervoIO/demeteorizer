var program = require('commander'),
    demeteorizer = require('../lib/demeteorizer'),
    path = require('path');

program
  .version('0.3.0')
  .option('-o, --output <path>', 'Output folder for converted application. Defaults to ./.demeteorized')
  .option('-n, --node_version <version>', 'The required version of node. Defaults to 0.8.24')
  .option('-r, --release <version>', 'Sets the Meteor version. Defaults to latest installed.')
  .parse(process.argv);

var output = program.output;
var node_version = program.node_version;
var release = program.release;

var input = process.cwd();

if(!output) {
  output = path.join(process.cwd(), '.demeteorized');
}

if(!node_version) {
  node_version = 'v0.8.24';
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

demeteorizer.convert(input, output, node_version, release, function(err) {
  if(err) {
    console.log('ERROR: ' + err);
  }
  else {
    console.log('Demeteorization complete.');
  }
});
