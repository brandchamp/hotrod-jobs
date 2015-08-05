'use strict';

var logger = require('hotrod-logger')(__filename);
var Promise = require('promise');

var currentlyRunning = {};

module.exports = {
    runOnce: function(jobFactoryFn) {
        var jobName = getJobName(jobFactoryFn);

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

        return jobFactoryFn().then(function(result) {
            removeRunningJob();
            return result;
        }, function(err) {
            removeRunningJob();
            return Promise.reject(err);
        });
    },
    runContinuous: function(jobFactoryFn, intervalSecs) {
        var jobName = getJobName(jobFactoryFn);

        var run = function(state) {
            if (state.stop) {
                return logger.info('Not running', jobName, ' - job was stopped');
            }
            this.runOnce(jobFactoryFn).then(function() {
                logger.trace('Job', jobName, 'finished successfully');
                runAfterInterval(state);
            }, function(err) {
                logger.error('Job', jobName, 'finished with error:', err);
                runAfterInterval(state);
            });
        }.bind(this);

        function runAfterInterval(state) {
            logger.trace('Scheduling job', jobName, 'to run in', intervalSecs, 'secs');
            setTimeout(function() {
                run(state);
            }, intervalSecs * 1000);
        }

        var state = {
            stop: false
        };
        run(state);

        return function stop(force) {
            logger.debug('Stopping job', jobName, 'Force?', !!force);
            state.stop = true;
            if (force) {
                return new Promise(function(resolve) {
                    jobFactoryFn.stop(resolve);
                });
            }
        };
    },
    // For tests
    _getCurrentlyRunningCount: function() {
        return Object.keys(currentlyRunning).length;
    }
};

function getJobName(jobPromiseFn) {
    return jobPromiseFn.jobName || '<unnamed job>';
}