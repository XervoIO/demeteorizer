var program = require('commander'),
    demeteorizer = require('../lib/demeteorizer'),
    path = require('path');

program
  .version('0.0.1')
  .option('-o, --output', 'Output folder for converted application.')
  .parse(process.argv);

var output = program.output;
var input = process.cwd();

if(!output) {
  output = path.join(process.cwd(), 'normalized');
}

console.log('Input: ' + input);
console.log('Output: ' + output);

demeteorizer.on('progress', function(msg) {
  console.log(msg);
});

demeteorizer.convert(input, output, function(err) {
  if(err) {
    console.log(err);
  }
});
