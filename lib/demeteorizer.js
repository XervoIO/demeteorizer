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
Demeteorizer.prototype.convert = function(input, output, nodeVersion, callback) {

  var self = this;

  self.paths = {
    package_json: path.join(output, 'package.json'),
    node_modules: path.join(output, 'server', 'node_modules'),
    server: path.join(output, 'server', 'server.js'),
    bundle: path.join(input, 'meteor-normalized.tar.gz')
  };

  async.series([
    function(callback) {
      self.setupOutputFolder(output, callback);
    },
    function(callback) {
      self.bundle(input, self.paths.bundle, callback);
    },
    function(callback) {
      self.extract(self.paths.bundle, output, callback);
    },
    function(callback) {
      self.createPackageJSON(input, output, callback);
    },
    function(callback) {
      self.setNodeVersion(self.paths.server, nodeVersion, callback);
    }
  ], callback);
};

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.setupOutputFolder = function(output, callback) {

  var self = this;

  if(fs.existsSync(output)) {
    if(fs.readdirSync(output).length > 0) {
      return callback('Output folder must be empty.');
    }
  }
  else {
    self.emit('progress', 'Creating output folder.');
    fs.mkdirSync(output);
  }

  callback();
};

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.bundle = function(input, bundle, callback) {

  var self = this;

  self.emit('progress', 'Bundling Meteor App...');

  exec('cd ' + input + ' && meteor bundle ' + path.basename(bundle), function(err, stdout, stderr) {

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

    // Move all content up from ./bundle to the output folder.
    var command = 'mv -i ' + path.join(output, 'bundle/*') + ' ' + output;

    exec(command, function(err, stdout, stderr) {
      if(err) {
        return callback(err);
      }

      if(stderr) {
        return callback(stderr);
      }

      self.emit('progress', 'Extraction complete.');

      fs.rmdirSync(path.join(output, 'bundle'));

      callback();
    });
  });
};

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.createPackageJSON = function(input, output, callback) {

  this.emit('progress', 'Creating package.json file.');


  var node_modules = this.paths.node_modules;

  if(!fs.existsSync(node_modules)) {
    return callback('Failed to find node_modules folder in: ' + node_modules);
  };

  var files = fs.readdirSync(node_modules);

  // Set the app name to the name of the input folder.
  var name = path.basename(input);
  if(!name) {
    name = 'Example';
  }

  // Remove spaces.
  name = name.replace(/' '/g, '');

  var packageJSON = {};
  packageJSON.name = name;
  packageJSON.description = name + ' - automatically converted by Demeteorizer. https://github.com/onmodulus/demeteorizer';
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

  fs.writeFileSync(this.paths.package_json, JSON.stringify(packageJSON, undefined, 2));

  this.emit('progress', 'package.json file generation complete.');
  callback();
};

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.setNodeVersion = function(serverFile, nodeVersion, callback) {

  this.emit('progress', 'Setting minimum node version to ' + nodeVersion);

  var contents = fs.readFileSync(serverFile, 'utf8');

  contents = contents.replace(/var MIN_NODE_VERSION = 'v[0-9\.]+';/, 'var MIN_NODE_VERSION = \'' + nodeVersion + '\';');

  fs.writeFileSync(serverFile, contents);

  callback();
};

module.exports = new Demeteorizer();

