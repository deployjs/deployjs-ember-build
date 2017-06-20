/*eslint-env node*/
'use strict';

var RSVP = require('rsvp');
var glob  = require('glob');
var DeployPluginBase = require('ember-cli-deploy-plugin');
var path = require('path');
const spawn = require('child_process').spawn;

module.exports = {
  name: 'deployjs-ember-build',

  createDeployPlugin: function(options) {
    var DeployPlugin = DeployPluginBase.extend({
      name: options.name,
      defaultConfig: {
        buildEnv: 'production',
        outputPath: 'tmp' + path.sep + 'deploy-dist'
      },

      build: function(/* context */) {
        var self       = this;
        var outputPath = this.readConfig('outputPath');
        var buildEnv   = this.readConfig('buildEnv');

        this.log('building app to `' + outputPath + '` using buildEnv `' + buildEnv + '`...', { verbose: true });

        return new RSVP.Promise(function(resolve, reject) {
          var build = spawn('ember', ['build', '--environment', buildEnv, '--output-path', outputPath], {
            cwd: undefined,
            env: process.env,
            shell: true
          });

          build.stdout.on('data', function(data) {
            this.log(data, { verbose: true });
          }.bind(this));

          build.stderr.on('data', function(data) {
            this.log(data, { color: 'red' });
          }.bind(this));

          build.on('close', function(code) {
            if(code !== 0) {
              reject('build failed');
            } else {
              resolve(outputPath);
            }
          });

          build.on('error', function(data) {
            reject(data);
          });
        }.bind(this))
        .then(this._logSuccess.bind(this, outputPath))
        .then(function(files) {
          files = files || [];

          return {
            distDir: outputPath,
            distFiles: files
          };
        })
        .catch(function(error) {
          this.log('build failed', { color: 'red' });
          return RSVP.reject(error);
        }.bind(this));
      },
      _logSuccess: function(outputPath) {
        var self = this;
        var files = glob.sync('**/**/*', { nonull: false, nodir: true, cwd: outputPath });

        if (files && files.length) {
          files.forEach(function(path) {
            self.log('✔  ' + path, { verbose: true });
          });
        }
        self.log('build ok', { verbose: true });

        return RSVP.resolve(files);
      }
    });
    return new DeployPlugin();
  }
};
