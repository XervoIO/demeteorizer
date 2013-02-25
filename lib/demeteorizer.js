var fs = require('fs'),
    os = require('os'),
    exec = require('child_process').exec,
    async = require('async'),
    EventEmitter = require('events').EventEmitter;
    util = require('util'),
    path = require('path');

//--------------------------------------------------------------------------------------------------
var Demeteorizer = function() {

};

util.inherits(Demeteorizer, EventEmitter);

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.convert = function(input, output, callback) {

  var self = this;

  var bundle = './meteor-normalized.tar.gz';

  async.series([
    function(callback) {
      self.setupOutputFolder(output, callback);
    },
    function(callback) {
      self.bundle(bundle, callback);
    },
    function(callback) {
      self.extract(bundle, output, callback);
    },
    function(callback) {
      self.createPackageJSON(output, callback);
    }
  ], callback);
};

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.setupOutputFolder = function(output, callback) {

  var self = this;

  async.series([
    function(callback) {
      self.emit('progress', 'Removing output folder.');
      exec('rm -rf ' + output, callback);
    },
    function(callback) {
      self.emit('progress', 'Creating output folder.');
      fs.mkdir(output, callback);
    }
  ], callback);
};

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.bundle = function(bundle, callback) {

  var self = this;

  self.emit('progress', 'Bundling Meteor App...');

  exec('meteor bundle ' + bundle, function(err, stdout, stderr) {
    if(stderr) {
      return callback(stderr);
    }

    if(err) {
      return callback(err);
    }

    self.emit('progress', 'Bundle generation complete.');
    callback();
  });
};

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.extract = function(bundle, output, callback) {

  var self = this;

  self.emit('progress', 'Extracting bundle.');

  exec('tar -C ' + output + ' -xf ' + bundle, function(err, stdout, stderr) {

    if(err) {
      return callback(err);
    }

    if(stderr) {
      return callback(stderr);
    }

    self.emit('progress', 'Extraction complete.');
    callback();
  });
};

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.createPackageJSON = function(output, callback) {

  this.emit('progress', 'Creating package.json file.');

  var node_modules = path.join(output, 'bundle', 'server', 'node_modules');

  if(!fs.existsSync(node_modules)) {
    callback('Failed to find node_modules folder in: ' + node_modules);
  };

  var files = fs.readdirSync(node_modules);

  var packageJSON = {};
  packageJSON.name = 'Something';
  packageJSON.description = 'Something';
  packageJSON.version = '0.0.1';
  packageJSON.main = 'main.js';
  packageJSON.dependencies = {};

  files.forEach(function(file) {
    var folder = path.join(node_modules, file);
    var stats = fs.statSync(folder);
    if(stats.isDirectory) {
      var package = path.join(folder, 'package.json');
      if(fs.existsSync(package)) {
        var contents = fs.readFileSync(package);
        contents = JSON.parse(contents);
        packageJSON.dependencies[contents.name] = contents.version;
      }
    }
  });

  fs.writeFileSync(path.join(output, 'bundle', 'package.json'),
    JSON.stringify(packageJSON, true));

  this.emit('progress', 'package.json file generation complete.');
  callback();
};

module.exports = new Demeteorizer();

