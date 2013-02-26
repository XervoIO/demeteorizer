Demeteorizer
=================

CLI tool to convert a Meteor app into a "standard" Node.js application. The resulting app contains
a package.json file with all required dependencies and can be easily ported to your own servers or
[Node.js PAAS providers](https://github.com/joyent/node/wiki/Node-Hosting).

## Installing
    $ npm install -g demeteorizer

## Usage
    $ cd /path/to/meteor/app
    $ demeteorizer [options]

    --version             print demeteorizer version and exit
    --output, -o          output directory for converted app. Defaults to ./.demeteorized.
    --node_version, -nv   version of node to override minimum node version variable. Defaults to 0.8.0.

## Examples
Convert the Meteor app in the current directory and output to ./.demeteorized

    $ demeteorizer

Convert the Meteor app in the current directory and output to ~/meteor-app/converted

    $ demeteorizer -o ~/meteor-app/converted

Convert the Meteor app in the current directory, output to ~/meteor-app/converter, and set minimum
node version to 0.8.11.

    $ demeteorizer -o ~/meteor-app/converted -nv v0.8.11

## Running Resulting App
Meteor apps make use of the following environment variables:

    1. MONGO_URL='mongodb://user:password@host:port/databasename'
    2. MAIL_URL='smtp://user:password@mailhost:port/' (optional)
    3. ROOT_URL='http://example.com' (optional)
    4. PORT=8080 (optional, defaults to 80)

Run the app:

    $ cd /your/output/directory
    $ npm install
    $ node main.js

## Full Example
The follow steps will create a Meteor example app, convert it, and run it.

    $ meteor create -example leaderboard
    $ demeteorizer
    $ cd ./.demeteorized
    $ npm install
    $ MONGO_URL=[your-url] PORT=8080 node main.js

