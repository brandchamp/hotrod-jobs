'use strict';

var Promise = require('promise');
var hotrodLogger = require('hotrod-logger');
var EventEmitter = require("events").EventEmitter;

module.exports = {
    create: function(jobName, jobFn) {
        var logger = hotrodLogger(jobName);
        var currentEventEmitter;
        var job = function job() {
            currentEventEmitter = new EventEmitter();
            return new Promise(function(resolve, reject) {
                try {
                    // Make sure to always call either resolve or reject so that job runner knows
                    // job is done and can be removed from list of running jobs
                    currentEventEmitter.on('stop', function() {
                        logger.info('Rejecting job promise because of force-stop');
                        reject(new Error('force-stopped'));
                    });

                    jobFn.call(currentEventEmitter, resolve, reject, logger);
                } catch (e) {
                    logger.error('Caught error running job ' + job.jobName + '. Error:', e);
                    reject(e);
                }
            });
        };
        job.stop = function(callback) {
            currentEventEmitter.emit('stop', callback);
            currentEventEmitter.removeAllListeners(); // stop any reference leaks
        };
        // Add a jobName attr for debugging purposes
        job.jobName = jobName;
        return job;
    }
};