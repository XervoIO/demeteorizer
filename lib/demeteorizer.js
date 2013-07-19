var fs = require('fs'),
    os = require('os'),
    exec = require('child_process').exec,
    async = require('async'),
    EventEmitter = require('events').EventEmitter;
    util = require('util'),
    path = require('path'),
    FsTools = require('fs-tools');

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
      self.findDependencies(output, callback);
    },
    function(callback) {
      self.createPackageJSON(self.dependencies, input, output, nodeVersion, callback);
    },
    function(callback) {
      self.setNodeVersion(self.paths.server, nodeVersion, callback);
    },
    function(callback) {
      self.deleteNodeModulesDirs(callback);
    },
    function(callback) {
      self.deleteBundle(callback);
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
  var cmd = 'meteor';

  self.emit('progress', 'Bundling Meteor App...');
  if(fs.existsSync(path.join(input, 'smart.json'))) {
    self.emit('progress', 'Found smart.json file, switching to Meteorite bundle.');
    cmd = 'mrt';
  }

  exec('cd ' + input + ' && ' + cmd + ' bundle ' + path.basename(bundle), function(err, stdout, stderr) {

    if(stdout) {
      self.emit('progress', stdout);
    }

    if(stderr) {
      return callback(stderr);
    }

    if(err) {
      return callback(err);
    }

    self.emit('progress', cmd + ' bundle generation complete.');
    callback();
  });
};

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.extract = function(bundle, output, callback) {

  var self = this;

  self.emit('progress', 'Extracting bundle.');

  exec('tar -C ' + output + ' -xf ' + bundle, function(err, stdout, stderr) {

    if(stdout) {
      self.emit('progress', stdout);
    }

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
Demeteorizer.prototype.findDependencies = function(output, callback) {

  this.emit('progress', 'Finding dependencies...');

  var nodeModulesDirs = [];

  var mainModulesDir = path.join(output, 'server', 'node_modules');
  if(fs.existsSync(mainModulesDir)) {
    nodeModulesDirs.push(mainModulesDir);
  }

  // Other dependencies can be found in the app/packages directory.
  var packagesDir = path.join(output, 'app', 'packages');
  var files = fs.readdirSync(packagesDir);
  files.forEach(function(f) {

    var file = path.join(packagesDir, f);
    var stats = fs.statSync(file);

    // Is there a node_modules folder inside the package?
    if(stats.isDirectory()) {
      var subFiles = fs.readdirSync(file);
      subFiles.forEach(function(ff) {
        var subFile = path.join(file, ff);
        if(ff === 'node_modules' && fs.statSync(subFile).isDirectory()) {
          nodeModulesDirs.push(subFile);
        }
      });
    }
  });

  var dependencies = {};
  var count = 0;

  // Go through every node_modules folder, read dependency package.json
  // files to get name/version.
  nodeModulesDirs.forEach(function(dir) {
    var files = fs.readdirSync(dir);
    files.forEach(function(file) {
      var folder = path.join(dir, file);
      var stats = fs.statSync(folder);
      if(stats.isDirectory()) {
        var package = path.join(folder, 'package.json');
        if(fs.existsSync(package)) {
          var contents = fs.readFileSync(package);
          contents = JSON.parse(contents);
          // lets weed out any npm dependencies, it's now in node
          if (contents.name != "npm") {
            dependencies[contents.name] = contents.version;
            count++;
          }
        }
      }
    });
  });

  this.nodeModuleDirs = nodeModulesDirs;
  this.dependencies = dependencies;
  this.emit('progress', count + ' dependencies found.');

  callback(null, dependencies);
};

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.createPackageJSON = function(dependencies, input, output, nodeVersion, callback) {

  this.emit('progress', 'Creating package.json file.');

  // Set the app name to the name of the input folder.
  var name = path.basename(input);
  if(!name) {
    name = 'Example';
  }

  // Remove spaces.
  name = name.replace(/' '/g, '');

  var nodeVersionJSON = { "node": nodeVersion.replace('v', '') };

  var packageJSON = {};
  packageJSON.name = name;
  packageJSON.description = name + ' - automatically converted by Demeteorizer. https://github.com/onmodulus/demeteorizer';
  packageJSON.version = '0.0.1';
  packageJSON.main = 'main.js';
  packageJSON.engines = nodeVersionJSON;
  packageJSON.dependencies = dependencies;

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

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.deleteNodeModulesDirs = function(callback) {

  this.emit('progress', 'Deleting node_modules folders.');

  var deleters = [];

  this.nodeModuleDirs.forEach(function(dir) {
    deleters.push(function(callback) {
      FsTools.remove(dir, callback);
    });
  });

  async.parallel(deleters, callback);
};

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.deleteBundle = function(callback) {

  this.emit('progress', 'Deleting bundle tar.gz file.');

  FsTools.remove(this.paths.bundle, callback);
};

module.exports = new Demeteorizer();

