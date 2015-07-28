'use strict';

var Promise = require('promise');
var hotrodLogger = require('hotrod-logger');

module.exports = {
    create: function(jobName, jobFn) {
        var logger = hotrodLogger(jobName);
        var job = function job() {
            return new Promise(function(resolve, reject) {
                try {
                    jobFn(resolve, reject, logger);
                } catch (e) {
                    logger.error('Caught error running job ' + job.jobName + '. Error:', e);
                    reject(e);
                }
            });
        };
        // Add a jobName attr for debugging purposes
        job.jobName = jobName;
        return job;
    }
};