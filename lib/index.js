var jobFactory = require('./jobFactory');
var jobRunner = require('./jobRunner');

module.exports = {
    create: jobFactory.create.bind(jobFactory),
    runOnce: jobRunner.runOnce.bind(jobRunner),
    runContinuous: jobRunner.runContinuous.bind(jobRunner)
};