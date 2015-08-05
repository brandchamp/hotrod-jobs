var chai = require('chai');
var assert = chai.assert;

var jobs = require('../lib/index');
var ForceStopError = require('../lib/forceStopError');

describe('Creating & Running Jobs', function() {

    afterEach(function() {
        assert.equal(jobs._getCurrentlyRunningCount(), 0, 'No jobs left running');
    });

    it('gives jobs a name to help with logging', function() {
        var job = jobs.create('MyJob', function(resolve, reject, logger) {
            resolve('good job');
        });
        assert.equal(job.jobName, 'MyJob');
    });

    describe('Run Once Jobs', function() {

        it('can run successful job', function(done) {
            var job = jobs.create('MyJob', function(resolve, reject, logger) {
                resolve('good job');
            });
            jobs.runOnce(job).then(function(result) {
                tryAssert(function() {
                    assert.equal(result, 'good job');
                }, done, done);
            });
        });

        it('can run job with error', function(done) {
            var job = jobs.create('MyJob', function(resolve, reject, logger) {
                reject('blerf');
            });
            jobs.runOnce(job).then(function(result) {
                done('should not be called');
            }, function(err) {
                tryAssert(function() {
                    assert.equal(err, 'blerf');
                }, done, done);
            });
        });

        it('can run job which throws', function(done) {
            var job = jobs.create('MyJob', function(resolve, reject, logger) {
                // Note: prefer to use reject rather than throw
                throw new Error('blerf');
            });
            jobs.runOnce(job).then(function(result) {
                done('should not be called');
            }, function(err) {
                tryAssert(function() {
                    assert.equal(err.message, 'blerf');
                }, done, done);
            });
        });

        it('can signal long running job to stop', function(done) {
            var job = jobs.create('MyJob', function(resolve, reject) {
                this.on('stop', function(stopped) {
                    stopped('stop return value');
                    // Note: can optionally call resolve / reject here if needed depending on use case
                });
            });

            var jobStopped = false;

            jobs.runOnce(job).then(function() {
                done('should not be called');
            }, function(err) {
                tryAssert(function() {
                    assert.isTrue(jobStopped, 'jobStopped');
                    assert.isTrue(err instanceof ForceStopError, 'ForceStopError');
                    assert.equal(err.message, 'force-stopped');
                }, done, done);
            });

            job.stop(function stopped(arg) {
                assert.equal(arg, 'stop return value');
                jobStopped = true;
            });
        });
    });

    describe('Run Continuous Jobs', function() {

        it('can run job multiple times and then stop', function(done) {
            var runCount = 0;
            var stopFn;
            var MAX_RUNS = 3;

            var onJobComplete = function() {
                ++runCount;

                if (runCount === MAX_RUNS) {
                    stopFn();

                    // Wait a little bit to make sure it really has stopped
                    setTimeout(function() {
                        tryAssert(function() {
                            assert.equal(runCount, MAX_RUNS, 'No more job runs');
                        }, done, done);
                    }, 300);
                }
            };

            var job = jobs.create('MyJob', function(resolve) {
                resolve();
                onJobComplete();
            });

            var intervalInSecs = 0.01;
            stopFn = jobs.runContinuous(job, intervalInSecs);
        });

        it('can force stop a continuous job which will signal long running job to stop', function(done) {
            var stopFn;
            var runCount = 0;
            // Note: need to wait for second run so that stopFn variable is set
            var EXPECTED_RUN_COUNT = 2;

            var onJobStarted = function() {
                if (++runCount !== EXPECTED_RUN_COUNT) {
                    return;
                }

                var force = true;
                var stopPromise = stopFn(force);

                stopPromise.then(function(result) {
                    tryAssert(function() {
                        assert.equal(result, 'stop return value');
                        assert.equal(runCount, EXPECTED_RUN_COUNT, 'Run one time');

                        // Wait a little bit to make sure it really has stopped
                        setTimeout(function() {
                            tryAssert(function() {
                                assert.equal(runCount, EXPECTED_RUN_COUNT, 'No more job runs');
                            }, done, done);
                        }, 300);
                    }, done);
                }, function(err) {
                    done('should not be called');
                });
            };

            var longRunningJob = jobs.create('MyJob', function(resolve, reject) {
                this.on('stop', function(stopped) {
                    stopped('stop return value');
                });
                onJobStarted();
                // Need to finish one run ok, then make it long running
                if (runCount === 1) {
                    resolve();
                }
            });

            var intervalInSecs = 0.01;
            stopFn = jobs.runContinuous(longRunningJob, intervalInSecs);
        });

        it('will continue to run job multiple times even if it occasionally fails', function(done) {
            var runCount = 0;
            var successCount = 0;
            var stopFn;
            var job = jobs.create('MyJob', function(resolve) {
                if (++runCount % 2 === 0) {
                    ++successCount;
                    resolve('ok');
                } else {
                    reject('failed');
                }
                if (successCount === 3) {
                    stopFn();
                    done();
                }
            });

            var intervalInSecs = 0.01;
            stopFn = jobs.runContinuous(job, intervalInSecs);
        });
    });
});

function tryAssert(assertFn, onError, onSuccess) {
    try {
        assertFn();
        if (onSuccess) {
            onSuccess();
        }
    } catch (e) {
        onError(e);
    }
}