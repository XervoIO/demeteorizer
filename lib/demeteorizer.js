var fs = require('fs'),
    exec = require('child_process').exec,
    async = require('async'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    path = require('path'),
    FsTools = require('fs-tools');

//
// Escape spaces out of a path.
//
var escapePath = function(path) {
  if (!path || path.length === 0) return path;
  return path.replace(/ /g, '\\ ');
};

//--------------------------------------------------------------------------------------------------
var Demeteorizer = function() {

};

util.inherits(Demeteorizer, EventEmitter);

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.convert = function(input, output, nodeVersion, release, tarball, appName, prerelease, callback) {

  var self = this;

  self.paths = {
    package_json: path.join(output, 'package.json'),
    old_node_modules: path.join(output, 'server', 'node_modules'),
    node_modules: path.join(output, 'programs', 'server', 'node_modules'),
    old_server: path.join(output, 'server', 'server.js'),
    server: path.join(output, 'programs', 'server', 'boot.js'),
    bundle: path.join(input, 'meteor-normalized.tar.gz')
  };

  async.series([
    function(callback) {
      self.setupOutputFolder(output, callback);
    },
    function(callback) {
      self.bundle(input, self.paths.bundle, release, prerelease, callback);
    },
    function(callback) {
      self.extract(self.paths.bundle, output, callback);
    },
    function(callback) {
      self.findDependencies(output, callback);
    },
    function(callback) {
      self.createPackageJSON(self.dependencies, input, output, nodeVersion, appName, callback);
    },
    function(callback) {
      if (fs.existsSync(self.paths.old_server)) {
        self.setNodeVersion(self.paths.old_server, nodeVersion, callback);
      } else {
        self.setNodeVersion(self.paths.server, nodeVersion, callback);
      }
    },
    function(callback) {
      self.deleteNodeModulesDirs(callback);
    },
    function(callback) {
      self.deleteBundle(callback);
    },
    function(callback) {
      self.createTarball(tarball, output, callback);
    },
    function(callback) {
      self.deleteDirectory(tarball, output, callback);
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
Demeteorizer.prototype.bundle = function(input, bundle, release, prerelease, callback) {

  var self = this;
  var cmd = 'meteor';

  self.emit('progress', 'Bundling Meteor App...');
  if(fs.existsSync(path.join(input, 'smart.json'))) {
    self.emit('progress', 'Found smart.json file, switching to Meteorite bundle.');
    cmd = 'mrt';
  }

  var releaseFlag = ' ';
  if(release) {
    releaseFlag = ' --release ' + release + ' ';
  }

  exec('cd ' + escapePath(input) + ' && ' + cmd + ' bundle' + releaseFlag + escapePath(path.basename(bundle)), function(err, stdout, stderr) {

    if(stdout) {
      self.emit('progress', stdout);
    }

    // Only break on stderr output if not a prerelease run.
    if(stderr && !prerelease) {
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

  exec('tar -C ' + escapePath(output) + ' -xf ' + escapePath(bundle), function(err, stdout, stderr) {

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
    var command = 'mv -i ' + escapePath(path.join(output, 'bundle/*')) + ' ' + escapePath(output);

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

  if(fs.existsSync(this.paths.old_node_modules)) {
    nodeModulesDirs.push(this.paths.old_node_modules);
  } else {
    nodeModulesDirs.push(this.paths.node_modules);
  }

  // Other dependencies can be found in the npm directories.
  var npmDirs = [];
  npmDirs.push({ path: path.join(output, 'app', 'packages') }); // pre 0.6.5.
  npmDirs.push({ path: path.join(output, 'programs', 'server', 'npm'), sub: 'main' });
  npmDirs.push({ path: path.join(output, 'programs', 'ctl', 'npm'), sub: 'main' });

  npmDirs.forEach(function(npmDir) {

    if(fs.existsSync(npmDir.path)) {

      var files = fs.readdirSync(npmDir.path);
      files.forEach(function(f) {

        var file = path.join(npmDir.path, f);

        var stats = fs.statSync(file);

        // Is there a node_modules folder inside the package?
        if(stats.isDirectory()) {
          var dir = npmDir.sub ? path.join(file, npmDir.sub) : file;

          if(fs.existsSync(dir)) {
            var subFiles = fs.readdirSync(dir);
            subFiles.forEach(function(ff) {

              var subFile = path.join(dir, ff);

              if(ff === 'node_modules' && fs.statSync(subFile).isDirectory()) {
                nodeModulesDirs.push(subFile);
              }
            });
          }
        }
      });
    }
  });

  var dependencies = {};
  var count = 0;

  // Go through every node_modules folder, read dependency package.json
  // files to get name/version.
  nodeModulesDirs.forEach(function(dir) {

    if(!fs.existsSync(dir)) {
      return;
    }

    var files = fs.readdirSync(dir);
    files.forEach(function(file) {
      var folder = path.join(dir, file);
      var stats = fs.statSync(folder);
      if(stats.isDirectory()) {
        var package = path.join(folder, 'package.json');
        if(fs.existsSync(package)) {

          var contents = fs.readFileSync(package);
          contents = JSON.parse(contents);

          // Set the dependency ignoring the dependency on npm which is
          // bundled with node.
          if(contents.name !== "npm") {
            dependencies[contents.name] = contents.version;
            count++;
          }

          // Meteor is using esprima v1.1.0-dev, which is not in npm.
          // Overwrite dependency version to use the repository for 1.1.0-dev.
          if(contents.name === 'esprima') {
            dependencies[contents.name] = 'https://github.com/ariya/esprima/tarball/2a41dbf0ddadade0b09a9a7cc9a0c8df9c434018';
          }

          // Meteor is using 2.0.0, which is not in npm.
          // Overwrite the dependency version to use the repository for 2.0.0.
          if(contents.name === 'css-parse') {
            dependencies[contents.name] = 'https://github.com/reworkcss/css-parse/tarball/aa7e23285375ca621dd20250bac0266c6d8683a5';
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
Demeteorizer.prototype.createPackageJSON = function(dependencies, input, output, nodeVersion, appName, callback) {

  this.emit('progress', 'Creating package.json file.');

  // Set the app name to the name of the input folder.
  var name = path.basename(input);
  if(!name) {
    name = 'Example';
  }

  // Replace spaces in the name with dashes.
  name = name.replace(/ /g, '-');

  var nodeVersionJSON = { "node": nodeVersion.replace('v', '') };

  var packageJSON = {};
  packageJSON.name = appName || name;
  packageJSON.description = name + ' - automatically converted by Demeteorizer. https://github.com/onmodulus/demeteorizer';
  packageJSON.version = '0.0.1';
  packageJSON.main = 'main.js';
  packageJSON.scripts = {
    start: "node main.js"
  };
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

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.createTarball = function(tarball, output, callback) {

  if(!tarball) {
    return callback();
  }

  var self = this;

  self.emit('progress', 'Creating tarball.');

  var cmd = 'tar czPf ' + escapePath(tarball) + ' -C ' + escapePath(output) + ' .';
  console.log(cmd);

  exec(cmd, function(err, stdout, stderr) {

    if(stdout) {
      self.emit('progress', stdout);
    }

    if(err) {
      return callback(err);
    }

    if(stderr) {
      return callback(stderr);
    }

    callback();
  });
}

//--------------------------------------------------------------------------------------------------
Demeteorizer.prototype.deleteDirectory = function(tarball, output, callback) {

  if(!tarball) {
    return callback();
  }

  this.emit('progress', 'Deleting bundle directory.');

  exec('rm -rf ' + escapePath(output), function(err, stdout, stderr) {
    if(err) {
      return callback(err);
    }

    if(stderr) {
      return callback(stderr);
    }

    callback();
  });
}

module.exports = new Demeteorizer();
