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

        var run = function(state) {
            this.runOnce(jobPromiseFn).then(function() {
                logger.trace('Job', jobName, 'finished successfully');
                runAfterInterval(state);
            }, function(err) {
                logger.error('Job', jobName, 'finished with error:', err);
                runAfterInterval(state);
            });
        }.bind(this);

        function runAfterInterval(state) {
            if (state.stop) {
                logger.info('Scheduled job', jobName, 'was stopped');
                return;
            }
            logger.trace('Scheduling job', jobName, 'to run in', intervalSecs, 'secs');
            setTimeout(function() {
                run(state);
            }, intervalSecs * 1000);
        }

        var state = {
            stop: false
        };
        run(state);

        return function stop() {
            logger.debug('Stopping job', jobName);
            state.stop = true;
        };
    }
};

function getJobName(jobPromiseFn) {
    return jobPromiseFn.jobName || '<unnamed job>';
}