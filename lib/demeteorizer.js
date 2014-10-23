var childProcess = require('child_process');
var EventEmitter = require('events').EventEmitter;
var fs           = require('fs');
var path         = require('path');
var util         = require('util');

var async        = require('async');
var FsTools      = require('fs-tools');
var semver       = require('semver');

const modulesNotInRegistry = [
  'aws-sdk-browser-builder'
];

/**
 * Escapes spaces out of the specified path.
 * @param {String} path The path to escape.
 */
var escapePath = function (path) {
  if (!path || path.length === 0) return path;
  return path.replace(/ /g, '\\ ');
};

/**
 * Demeteorizer constructor function. Derives from EventEmitter.
 *
 * @constructor
 */
function Demeteorizer() {}

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
Demeteorizer.prototype.convert = function (options, callback) {

  var context = {
    meteorVersion : null,
    options       : options,
    paths         : this.setupPaths(options)
  };

  this.emit('progress', 'Input:  ' + options.input);
  this.emit('progress', 'Output: ' + options.output);

  async.series([
    this.getMeteorVersion.bind(this, context),
    this.setupOutputFolder.bind(this, context),
    this.bundle.bind(this, context),
    this.findDependencies.bind(this, context),
    this.createPackageJSON.bind(this, context),
    this.deleteNodeModulesDirs.bind(this, context),
    this.deleteShrinkWraps.bind(this, context),
    this.createTarball.bind(this, context),
    this.deleteDirectory.bind(this, context)
  ], callback);
};

/**
 * Configures the various paths used for a conversion.
 * @param {Object} options Options for the conversion.
 * @returns {Object} Object containing paths.
 */
Demeteorizer.prototype.setupPaths = function (options) {
  return {
    node_modules     : path.join(options.output, 'programs', 'server', 'node_modules'),
    old_node_modules : path.join(options.output, 'server', 'node_modules'),
    old_server       : path.join(options.output, 'server', 'server.js'),
    package_json     : path.join(options.output, 'package.json'),
    server           : path.join(options.output, 'programs', 'server', 'boot.js')
  };
};

/**
 * Gets the Meteor version using the "meteor --version" command.
 * Only returns the version. For example "meteor --version" returns
 * "Release 0.8.3", this will return "0.8.x".
 * @param {Object} context Context of this convert.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.getMeteorVersion = function (context, callback) {

  this.emit('progress', 'Determining Meteor version...');

  childProcess.exec('meteor --version', function (err, stdout) {
    if (err) {
      return callback(err);
    }

    if (!stdout) {
      return callback(new Error(
        'Could not determine Meteor version. Make sure that Meteor is installed.'
      ));
    }

    // Typical `$ meteor --version` output returns 2 pieces when split on \n
    //    the version and an empty string.
    // If the length of the split is more than 2, the output includes some extra
    //    stuff so the return value should be based on the last line of text.
    var versionLines = stdout.split('\n');
    var versionText = versionLines.length > 2
      ? versionLines[versionLines.length - 2]
      : stdout;

    // Split on space and take the second element because the version output is
    //    `Meteor x.x.x.x`.
    var version = versionText.split(' ')[1].trim();
    var versionParts = version.split('.');
    context.meteorVersion = versionParts[0] + '.' + versionParts[1] + '.x';

    this.emit('progress', 'Meteor version: ' + version);
    callback(null, context.meteorVersion);
  }.bind(this));
};

/**
 * Deletes the output folder if it exists.
 * @param {Object} context Context of this convert.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.setupOutputFolder = function (context, callback) {

  var output = context.options.output;

  if (fs.existsSync(output)) {
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
Demeteorizer.prototype.getBundleCommand = function (context) {
  var cmd = 'meteor';

  var smartJsonPath = path.join(context.options.input, 'smart.json');

  if (semver.lte(context.meteorVersion.replace('x', '0'), '0.8.0') && fs.existsSync(smartJsonPath)) {
    this.emit('progress', 'Found smart.json file, switching to Meteorite bundle.');
    cmd = 'mrt';
  }

  return cmd;
};

/**
 * Uses Meteor's built-in bundle command to bundle the source into a node application.
 * @param {Object} context The context for this deploy.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.bundle = function (context, callback) {

  var cmd         = this.getBundleCommand(context);
  var release     = context.options.release;
  var releaseFlag = ' ';

  this.emit('progress', 'Bundling Meteor App...');

  if (context.options.debug) {
    this.emit('progress', 'Running Meteor bundle in debug mode.');
  }

  if (release) {
    releaseFlag = ' --release ' + release + ' ';
  }

  // meteor bundle --debug --version 0.x.x --directory ./
  var bundleCommand = util.format('cd %s && %s bundle %s %s --directory %s',
    escapePath(context.options.input),
    cmd,
    context.options.debug ? '--debug' : '',
    release ? '--release ' + release : '',
    escapePath(context.options.output)
  );

  childProcess.exec(bundleCommand, function (err, stdout, stderr) {
    if (err) {
      return callback(err);
    }

    if (stdout) {
      this.emit('progress', stdout.trim());
    }

    if (stderr) {
      this.emit('progress', stderr.trim());
    }

    this.emit('progress', cmd + ' bundle generation complete.');
    callback();
  }.bind(this));
};

/**
 * Finds all the dependencies in the folder. Recursively calls for every
 * subfolder. Skips node_modules folders if already in a node_modules folder.
 * @param {String} folder The folder to look in.
 * @param {Boolean} inNodeModulesFolder Whether or not we're already in a node_modules folder.
 * @param {Object} context Context for this convert.
 */
Demeteorizer.prototype.findDependenciesInFolder = function (folder, inNodeModulesFolder, context) {

  fs.readdirSync(folder).forEach(function (file) {
    var stats = fs.statSync(path.join(folder, file));
    if (stats.isDirectory()) {
      var inNodeMod = false;
      var keepGoing = true;

      if (file === 'node_modules') {
        inNodeMod = true;
        if (inNodeModulesFolder) {
          keepGoing = false;
        }
      }

      // Skip the examples directory.
      if (file === 'examples') {
        keepGoing = false;
      }

      if (keepGoing) {
        this.findDependenciesInFolder(path.join(folder, file), inNodeMod, context);
      }
    } else {
      if (file === 'package.json') {
        var packageData = fs.readFileSync(path.join(folder, file));

        // Test that the package.json contains data.
        if (packageData.length > 0) {
          var packageJson = null;

          try {
            packageJson = JSON.parse(packageData);
          } catch (e) {
            this.emit('progress', util.format(
              'Warning: failed to parse package.json for %s',
              path.basename(folder)
            ));
          }

          // Only add the dependency if the package is valid.
          if (packageJson) {
            var filtered = this.filterDep(
              packageJson.name,
              packageJson._resolved || packageJson.version
            );

            if (filtered) {
              context.dependencies[filtered.name] = filtered.version;
            }

            if (packageJson.dependencies) {
              Object.keys(packageJson.dependencies).forEach(function (dep) {
                var filtered = this.filterDep(
                  dep,
                  packageJson.dependencies[dep]
                );

                if (filtered) {
                  context.dependencies[filtered.name] = filtered.version;
                }
              }.bind(this));
            }
          }
        }
      }
    }
  }.bind(this));
};

/**
 * Changes, removes, etc dependencies.
 * @param {String} name The name of the dep.
 * @param {String} version The version of the dep.
 * @returns {Object} Object with name, version properties adjusted. Or null if
 *    dependency is to be removed.
 */
Demeteorizer.prototype.filterDep = function (name, version) {

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
Demeteorizer.prototype.findDependencies = function (context, callback) {

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
Demeteorizer.prototype.createPackageJSON = function (context, callback) {

  this.emit('progress', 'Creating package.json file.');

  var input = context.options.input;
  var appName = context.options.appName;

  // Set the app name to the name of the input folder.
  var name = path.basename(input);
  if (!name) {
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

  fs.writeFileSync(context.paths.package_json, JSON.stringify(packageJSON, null, 2));

  this.emit('progress', 'package.json file generation complete.');
  callback();
};

/**
 * Deletes all node_modules folders.
 * @param {Object} context Context of the convert.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.deleteNodeModulesDirs = function (context, callback) {

  this.emit('progress', 'Deleting node_modules folders.');

  this.deleteNodeModulesDir(context.options.output);

  callback();
};

/**
 * Deletes node_modules folders. Recursively looks through all folders.
 * @param {String} folder The folder to look in.
 */
Demeteorizer.prototype.deleteNodeModulesDir = function (folder) {

  var files = fs.readdirSync(folder);
  var self = this;

  files.forEach(function (file) {
    var stat = fs.statSync(path.join(folder, file));
    if (stat.isDirectory() && file === 'node_modules') {
      FsTools.removeSync(path.join(folder, file));
    }
    else if (stat.isDirectory()) {
      self.deleteNodeModulesDir(path.join(folder, file));
    }
  });
};

/**
 * Deletes all shrinkwrap files.
 * @param {Object} context Context for the convert.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.deleteShrinkWraps = function (context, callback) {

  var go = function (folder) {
    var files = fs.readdirSync(folder);
    files.forEach(function (file) {
      var stats = fs.statSync(path.join(folder, file));
      if (stats.isDirectory()) {
        go(path.join(folder, file));
      }
      else if (file === 'npm-shrinkwrap.json') {
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
Demeteorizer.prototype.createTarball = function (context, callback) {

  if (!context.options.tarball) {
    return callback();
  }

  this.emit('progress', 'Creating tarball.');

  var cmd = util.format(
    'tar czPf %s -C %s .',
    escapePath(context.options.tarball),
    escapePath(context.options.output)
  );

  childProcess.exec(cmd, function (err, stdout) {

    if (stdout) {
      this.emit('progress', stdout);
    }

    if (err) {
      return callback(err);
    }

    callback();
  }.bind(this));
};

/**
 * Deletes the output directory if the tarball option is specified.
 * @param {Object} context Context of the convert.
 * @param {Function} callback Callback handling the response.
 */
Demeteorizer.prototype.deleteDirectory = function (context, callback) {

  if (!context.options.tarball) {
    return callback();
  }

  this.emit('progress', 'Deleting bundle directory.');

  FsTools.remove(context.options.output, callback);
};

module.exports = new Demeteorizer();
