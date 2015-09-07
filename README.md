Demeteorizer
============

[![NPM version](https://badge.fury.io/js/demeteorizer.svg)](http://badge.fury.io/js/demeteorizer) [![Build Status](https://travis-ci.org/onmodulus/demeteorizer.svg?branch=master)](https://travis-ci.org/onmodulus/demeteorizer)

CLI tool to convert a Meteor app into a "standard" Node.js application. The
resulting app contains a package.json file with all required dependencies and
can be easily ported to your own servers or
[Node.js PAAS providers](https://github.com/joyent/node/wiki/Node-Hosting).

Note that version 3 of Demteorizer changes the output structure, which may cause
issues depending on how/where you are deploying your application. With the new
structure, the generated node application is available in
`bundle/programs/server`.

## How Demeteorizer Works

Demeteorizer bundles your Meteor application using `meteor build` then updates
the generated `package.json` to include all of the necessary properties for
running the application on a PaaS provider.

## Installing

Install Demeteorizer globally using npm

    $ npm install -g demeteorizer

## Usage

    $ cd /path/to/meteor/app
    $ demeteorizer [options]

    -h, --help                 output usage information
    -V, --version              output the version number
    -o, --output <path>        Output folder for converted application [.demeteorized]
    -a, --architecture <arch>  Build architecture to be generated
    -d, --debug                Build the application in debug mode (don't minify, etc)
    -j, --json <json>          JSON data to be merged into the generated package.json

## Windows Support

Demeteorizer works on Windows; however, errors will occur when repeatedly
running demeteorizer in Node.js versions
[prior to 0.12.4](https://github.com/joyent/node/issues/3006).

The workaround on earlier versions on Node.js is to delete to generated
`.demeteorized` directory before rerunning demeteorizer.

## Meteor 0.8.1 and Below

Meteor version 0.8.1 and below are only supported in Demeteorizer version
v0.9.0 and Modulus CLI v1.1.0. For all other versions, use the latest version
of Demeteorizer.

This is because the `bundle` command changed in 0.9 which makes backward
compatibility impossible. :(

## Running Resulting Application

Meteor applications make use of the following environment variables:

1. `MONGO_URL='mongodb://user:password@host:port/databasename?autoReconnect=true'`
1. `ROOT_URL='http://example.com'`
1. `MAIL_URL='smtp://user:password@mailhost:port/' (optional)`
1. `PORT=8080 (optional, defaults to 80)`

Note that demeteorized applications still require a MongoDB connection in order
to correctly run. To run your demeteorized application locally, you will need
MongoDB [installed](http://docs.mongodb.org/manual/installation/) and running.

Run the app:

    $ cd /your/output/directory/bundle/programs/server
    $ npm install
    $ MONGO_URL=mongodb://localhost:27017/test PORT=8080 ROOT_URL=http://localhost:8080 npm start

## Examples

Convert the Meteor app in the current directory and output to `./.demeteorized`

    $ demeteorizer

Convert the Meteor app in the current directory and output to
`~/meteor-app/converted`

    $ demeteorizer -o ~/meteor-app/converted

The following steps will create a Meteor example app, convert it, and run it.

    $ meteor create --example leaderboard
    $ cd leaderboard
    $ demeteorizer
    $ cd .demeteorized/bundle/programs/server
    $ npm install
    $ MONGO_URL=mongodb://localhost:27017/test PORT=8080 ROOT_URL=http://localhost:8080 npm start

Visit http://localhost:8080 in your browser.

## Modifying the Generated package.json

The `--json` option will allow you to pass arbitrary JSON data that will be
added to the generated package.json. You can use this to override settings in
package.json or to add arbitrary data.

_settings.json_

    {
      "settings": {
        "key": "some-key-data",
        "services": {
          "some-service": {
            "key": "another-key"
          }
        }
      }
    }

Add settings.json data to the generated package.json

    $ demeteorizer --json "$(cat settings.json)"

The resulting package.json will have a `settings` property that includes the
JSON from settings.json.

You can also use this to override settings

    $ demeteorizer --json "{ \"engines\": { \"node\": \"0.12.x\" } }"

This will result in a package.json with the node engine set to 0.12.x.

## Debug

The --debug option is passed to the meteor build command indicating to meteor
that the application should not be minified.

    $ demeteorizer --debug

## Support

Demeteorizer has been tested with the current Meteor example apps. If you find
an app that doesn't convert correctly, throw an issue in Github -
[https://github.com/onmodulus/demeteorizer/issues](https://github.com/onmodulus/demeteorizer/issues)

## Release History

See [releases](https://github.com/onmodulus/demeteorizer/releases).

## License

The MIT License (MIT)

Copyright (c) 2015 Modulus

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
