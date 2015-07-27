'use strict';

var logger = require('hotrod-logger')(__filename);
var Promise = require('promise');

var currentlyRunning = {};

module.exports = {
    runOnce: function(jobPromiseFn) {
        var jobName = getJobName(jobPromiseFn);

        if (jobName in currentlyRunning) {
            var msg = 'Could not start job "' + jobName + '" as it was already running';
            logger.trace(msg);
            return Promise.reject(msg);
        }

        logger.trace('Running job:', jobName);
        currentlyRunning[jobName] = true;

        function removeRunningJob() {
            delete currentlyRunning[jobName];
        }

        // no .finally() fn included with this promise library :/
        return jobPromiseFn().then(function(result) {
            removeRunningJob();
            return result;
        }, function(err) {
            removeRunningJob();
            return Promise.reject(err);
        });
    },
    runContinuous: function(jobPromiseFn, intervalSecs) {
        var jobName = getJobName(jobPromiseFn);

        var stop = false;
        var runAfterInterval = function() {
            if (stop) {
                logger.debug('Scheduled job', jobName, 'was stopped');
            }
            logger.trace('Scheduling job', jobName, 'to run in', intervalSecs, 'secs');
            setTimeout(function() {
                this.runContinuous(jobPromiseFn, intervalSecs);
            }.bind(this), intervalSecs * 1000);
        }.bind(this);

        this.runOnce(jobPromiseFn).then(function() {
            logger.trace('Job', jobName, 'finished successfully');
            runAfterInterval();
        }, function(err) {
            logger.trace('Job', jobName, 'finished with error:', err);
            runAfterInterval();
        });

        return function stop() {
            stop = true;
        };
    }
};

function getJobName(jobPromiseFn) {
    return jobPromiseFn.jobName || '<unnamed job>';
}