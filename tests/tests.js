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
                assert.equal(result, 'good job');
                done();
            });
        });

        it('can run job with error', function(done) {
            var job = jobs.create('MyJob', function(resolve, reject, logger) {
                reject('blerf');
            });
            jobs.runOnce(job).then(function(result) {
                done('should not be called');
            }, function(err) {
                assert.equal(err, 'blerf');
                done();
            });
        });
    });

    describe('Run Continuous Jobs', function() {

        it('can run successful job multiple times', function(done) {
            var runCount = 0;
            var stopFn;
            var job = jobs.create('MyJob', function(resolve) {
                resolve('good job');
                if (++runCount === 3) {
                    stopFn();
                    done();
                }
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
