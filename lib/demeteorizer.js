var fs = require('fs'),
    exec = require('child_process').exec,
    async = require('async'),
    EventEmitter = require('events').EventEmitter,
    util = require('util'),
    path = require('path'),
    FsTools = require('fs-tools'),
    semver = require('semver');

/**
 * Escapes spaces out of the specified path.
 * @param {String} path The path to escape.
 */
var escapePath = function(path) {
  if (!path || path.length === 0) return path;
  return path.replace(/ /g, '\\ ');
};

const modulesNotInRegistry = [
  'aws-sdk-browser-builder'
];

//--------------------------------------------------------------------------------------------------
var Demeteorizer = function() {

};

util.inherits(Demeteorizer, EventEmitter);

/**
 * Converts a Meteor app into a "standard" Node.js application.
 * @param {Object} options Options for the convert.
 * @param {String} options.input The input directory containing Meteor application.
 * @param {String} options.output The output directory.
 * @param {String} options.release The meteor release to use (e.g. 0.9.0.1).
 * @param {String} options.tarball Optional tarball path to put output.
 * @param {String} options.appName Optional application name to put in package.json.
 * @param {Boolean} options.prerelease Whether to ignore warnings based on Meteor version.
 * @param {Boolean} options.debug Whether to run Meteor's bundle in debug mode.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.convert = function(options, callback) {

  var self = this;

  var context = {
    paths: this.setupPaths(options),
    meteorVersion: null,
    options: options
  };

  async.series([
    function(callback) {
      self.getMeteorVersion(context, callback);
    },
    function(callback) {
      self.setupOutputFolder(context, callback);
    },
    function(callback) {
      self.bundle(context, callback);
    },
    function(callback) {
      self.findDependencies(context, callback);
    },
    function(callback) {
      self.createPackageJSON(context, callback);
    },
    function(callback) {
      self.deleteNodeModulesDirs(context, callback);
    },
    function(callback) {
      self.deleteShrinkWraps(context, callback);
    },
    function(callback) {
      self.createTarball(context, callback);
    },
    function(callback) {
      self.deleteDirectory(context, callback);
    }
  ], callback);
};

/**
 * Configures the various paths used for a conversion.
 * @param {Object} options Options for the conversion.
 * @returns {Object} Object containing paths.
 */
Demeteorizer.prototype.setupPaths = function(options) {
  return {
    package_json: path.join(options.output, 'package.json'),
    old_node_modules: path.join(options.output, 'server', 'node_modules'),
    node_modules: path.join(options.output, 'programs', 'server', 'node_modules'),
    old_server: path.join(options.output, 'server', 'server.js'),
    server: path.join(options.output, 'programs', 'server', 'boot.js')
  };
};

/**
 * Gets the Meteor version using the "meteor --version" command.
 * Only returns the version. For example "meteor --version" returns
 * "Release 0.8.3", this will return "0.8.x".
 * @param {Object} context Context of this convert.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.getMeteorVersion = function(context, callback) {

  var self = this;

  self.emit('progress', 'Determining Meteor version...');

  exec('meteor --version', function(err, stdout, stderr) {
    if(err || stderr || !stdout) {
      self.emit('error', 'Could not determine Meteor version. Please ensure Meteor tools are installed.');
      return callback(new Error('Could not determine Meteor version.'));
    }

    var version = stdout.split(' ')[1];
    var versionParts = version.split('.');
    context.meteorVersion = versionParts[0] + '.' + versionParts[1] + '.x';

    self.emit('progress', 'Meteor version: ' + version);
    callback(null, context.meteorVersion);
  });
};


/**
 * Deletes the output folder if it exists.
 * @param {Object} context Context of this convert.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.setupOutputFolder = function(context, callback) {

  var output = context.options.output;

  if(fs.existsSync(output)) {
    this.emit('progress', 'Output folder exists, deleting...');
    FsTools.remove(output, callback);
  }
  else {
    callback();
  }

};

/**
 * Based on the version of meteor and other details, finds the
 * root command to use for bundling (meteor, mrt, etc).
 * @param {Object} context Context of this convert.
 * @returns {String} Command used for bundling.
 */
Demeteorizer.prototype.getBundleCommand = function(context) {
  var cmd = 'meteor';

  var smartJsonPath = path.join(context.options.input, 'smart.json');

  if(semver.lte(context.meteorVersion.replace('x', '0'), '0.8.0') && fs.existsSync(smartJsonPath)) {
    this.emit('progress', 'Found smart.json file, switching to Meteorite bundle.');
    cmd = 'mrt';
  }

  return cmd;
};

/**
 * Uses Meteor's built-in bundle command to bundle the source into a node application.
 * @param {Object} context The context meteoof this deploy.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.bundle = function(context, callback) {

  var input = context.options.input;
  var output = context.options.output;
  var release = context.options.release;
  var prerelease = context.options.prerelease;
  var debug = context.options.debug;

  var self = this;

  self.emit('progress', 'Bundling Meteor App...');

  var cmd = self.getBundleCommand(context);

  if(debug) {
    self.emit('progress', 'Running Meteor bundle in debug mode.');
  }

  var releaseFlag = ' ';
  if(release) {
    releaseFlag = ' --release ' + release + ' ';
  }

  // meteor bundle --debug --version 0.x.x --directory ./
  var bundleCommand = util.format('cd %s && %s bundle %s %s --directory %s',
    escapePath(input),
    cmd,
    debug ? '--debug' : '',
    release ? '--release ' + release : '',
    escapePath(output));

  exec(bundleCommand, function(err, stdout, stderr) {

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

/**
 * Finds all the dependencies in the folder. Recursively calls for every
 * subfolder. Skips node_modules folders if already in a node_modules folder.
 * @param {String} folder The folder to look in.
 * @param {Boolean} inNodeModulesFolder Whether or not we're already in a node_modules folder.
 * @param {Object} context Context for this convert.
 */

Demeteorizer.prototype.findDependenciesInFolder = function(folder, inNodeModulesFolder, context) {

  var files = fs.readdirSync(folder);
  var self = this;

  files.forEach(function(file) {
    var stats = fs.statSync(path.join(folder, file));
    if(stats.isDirectory()) {
      var inNodeMod = false;
      var keepGoing = true;
      if(file === 'node_modules') {
        inNodeMod = true;
        if(inNodeModulesFolder) {
          keepGoing = false;
        }
      }

      // sockjs comes with example folders, remove.
      if(file === 'examples') {
        keepGoing = false;
      }

      if(keepGoing) {
        self.findDependenciesInFolder(path.join(folder, file), inNodeMod, context);
      }
    }
    else {
      if(file === 'package.json') {
        var packageJson = JSON.parse(fs.readFileSync(path.join(folder, file)));
        var filtered = self.filterDep(packageJson.name, packageJson._resolved || packageJson.version);
        if(filtered) {
          context.dependencies[filtered.name] = filtered.version;
        }
        if(packageJson.dependencies) {
          Object.keys(packageJson.dependencies).forEach(function(dep) {
            var filtered = self.filterDep(dep, packageJson.dependencies[dep]);
            if(filtered) {
              context.dependencies[filtered.name] = filtered.version;
            }
          });
        }
      }
    }
  });

};

/**
 * Changes, removes, etc dependencies.
 * @param {String} name The name of the dep.
 * @param {String} version The version of the dep.
 * @returns {Object} Object with name, version properties adjusted. Or null if
 *    dependency is to be removed.
 */
Demeteorizer.prototype.filterDep = function(name, version) {

  var filtered = { name: name, version: version };

  // If the version starts with '0.0.0', just skip it.
  if (version === undefined || version.indexOf('0.0.0') === 0) {
    filtered = null;
  }

  // The 0.4.12 usage module has trouble compile. Switch it to 0.4.13.
  if (name === 'usage' && version === '0.4.12') {
    filtered.version = '0.4.13';
  }

  // Filter out any modules that are not present in the registry.
  if (modulesNotInRegistry.indexOf(name) >= 0) {
    filtered = null;
  }

  return filtered;
};

/**
 * Finds all npm dependencies for the bundled output.
 * @param {Object} context The context of this convert.
 * @param {Function} callback Callback handling response.
 */
Demeteorizer.prototype.findDependencies = function(context, callback) {

  this.emit('progress', 'Finding dependencies...');

  var output = context.options.output;

  context.dependencies = {};

  this.findDependenciesInFolder(output, false, context);

  this.emit('progress', Object.keys(context.dependencies).length + ' dependencies found.');

  callback(null, context.dependencies);
};

/**
 * Creates the package.json file.
 * @param {Object} context Context for the convert.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.createPackageJSON = function(context, callback) {

  this.emit('progress', 'Creating package.json file.');

  var input = context.options.input;
  var appName = context.options.appName;

  // Set the app name to the name of the input folder.
  var name = path.basename(input);
  if(!name) {
    name = 'Example';
  }

  // Replace spaces in the name with dashes.
  name = name.replace(/ /g, '-');

  var packageJSON = {};
  packageJSON.name = appName || name;
  packageJSON.description = name + ' - automatically converted by Demeteorizer. https://github.com/onmodulus/demeteorizer';
  packageJSON.version = '0.0.1';
  packageJSON.main = 'main.js';
  packageJSON.scripts = {
    start: 'node main.js'
  };
  packageJSON.dependencies = context.dependencies;

  fs.writeFileSync(context.paths.package_json, JSON.stringify(packageJSON, undefined, 2));

  this.emit('progress', 'package.json file generation complete.');
  callback();
};

/**
 * Deletes all node_modules folders.
 * @param {Object} context Context of the convert.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.deleteNodeModulesDirs = function(context, callback) {

  this.emit('progress', 'Deleting node_modules folders.');

  this.deleteNodeModulesDir(context.options.output);

  callback();
};

/**
 * Deletes node_modules folders. Recursively looks through all folders.
 * @param {String} folder The folder to look in.
 */
Demeteorizer.prototype.deleteNodeModulesDir = function(folder) {

  var files = fs.readdirSync(folder);
  var self = this;

  files.forEach(function(file) {
    var stat = fs.statSync(path.join(folder, file));
    if(stat.isDirectory() && file === 'node_modules') {
      FsTools.removeSync(path.join(folder, file));
    }
    else if(stat.isDirectory()) {
      self.deleteNodeModulesDir(path.join(folder, file));
    }
  });
};

/**
 * Deletes all shrinkwrap files.
 * @param {Object} context Context for the convert.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.deleteShrinkWraps = function(context, callback) {

  var go = function(folder) {
    var files = fs.readdirSync(folder);
    files.forEach(function(file) {
      var stats = fs.statSync(path.join(folder, file));
      if(stats.isDirectory()) {
        go(path.join(folder, file));
      }
      else if(file === 'npm-shrinkwrap.json') {
        fs.unlinkSync(path.join(folder, file));
      }
    });
  };

  go(context.options.output);
  callback();
};

/**
 * Creates a tarball of the output. Only applies if the tarball option is set.
 * @param {Object} context Context of the convert.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.createTarball = function(context, callback) {

  if(!context.options.tarball) {
    return callback();
  }

  var self = this;

  self.emit('progress', 'Creating tarball.');

  var cmd = 'tar czPf ' + escapePath(context.options.tarball) + ' -C ' + escapePath(context.options.output) + ' .';

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
};

/**
 * Deletes the output directory if the tarball option is specified.
 * @param {Object} context Context of the convert.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.deleteDirectory = function(context, callback) {

  if(!context.options.tarball) {
    return callback();
  }

  this.emit('progress', 'Deleting bundle directory.');

  FsTools.remove(context.options.output, callback);
};

module.exports = new Demeteorizer();
