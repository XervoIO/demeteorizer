var program = require('commander'),
    normalizer = require('../lib/meteor-normalizer'),
    path = require('path');

program
  .version('0.0.1')
  .option('-o, --output', 'Output folder for normalized application.')
  .parse(process.argv);

var output = program.output;
var input = process.cwd();

if(!output) {
  output = path.join(process.cwd(), 'normalized');
}

console.log('Input: ' + input);
console.log('Output: ' + output);

normalizer.on('progress', function(msg) {
  console.log(msg);
});

normalizer.normalize(input, output, function(err) {
  if(err) {
    console.log(err);
  }
});
