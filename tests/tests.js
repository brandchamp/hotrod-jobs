var chai = require('chai');
var assert = chai.assert;

var jobs = require('../lib/index');

describe('Creating & Running Jobs', function() {

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
                }, done);
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
                }, done);
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
                }, done);
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
                        }, done);
                    }, 300);
                }
            };

            var job = jobs.create('MyJob', function(resolve) {
                // Note: stop event only fires if force-stopped. See test below
                this.on('stop', function() {
                    done('Error - force stop should not be called');
                });
                resolve();
                onJobComplete();
            });

            var intervalInSecs = 0.01;
            stopFn = jobs.runContinuous(job, intervalInSecs);
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

function tryAssert(assertFn, done) {
    try {
        assertFn();
        done();
    } catch (e) {
        done(e);
    }
}