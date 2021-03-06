const validate = require('validate.js');
const Events = require('../Events');

class Status {
    constructor(data) {
        this.data = data;
    }

    static getJobConstraints() {
        return {
            name: {
                presence: true,
            },
            stage: {},
            state: {
                presence: true,
                inclusion: ['info', 'pending', 'running', 'error', 'success', 'warning'],
            },
        };
    }

    static jobsValidator(jobs) {
        // Do not care if not set
        if (!jobs) {
            return;
        }

        if (!validate.isArray(jobs)) {
            return 'Jobs must be an array';
        }

        const errors = [];
        jobs.forEach((job, index) => {
            const validateErrors = validate(job, Status.getJobConstraints());
            if (validateErrors) {
                errors.push(`job ${index}: ${JSON.stringify(validateErrors)}`);
            }
        });

        return errors.length > 0 ? errors : null;
    }

    static stagesValidator(stages) {
        // Do not care if not set
        if (!stages) {
            return;
        }

        if (!validate.isArray(stages)) {
            return 'Stages must be an array';
        }

        if (stages.find(stage => !validate.isString(stage))) {
            return 'Stages must be an array of strings';
        }
    }

    static getStatusConstraints() {
        validate.validators.jobsValidator = this.jobsValidator;
        validate.validators.stagesValidator = this.stagesValidator;

        return {
            key: {
                presence: true,
                format: /[\d\w_-]+/,
            },
            state: {
                presence: true,
                inclusion: ['success', 'warning', 'error', 'info'],
            },
            title: {
                presence: true,
            },
            subTitle: {},
            image: {
                url: true,
            },
            userImage: {
                url: true,
            },
            stages: {
                stagesValidator: true,
            },
            jobs: {
                jobsValidator: true,
            },
        };
    }

    /**
     * Create a status and let the application take care of the rest.
     * If the data.key already exists, the StatusManager will take care of that.
     *
     * @param {Object} data
     */
    static createStatus(data) {
        console.log('[Status] Creating status...');

        return validate
            .async(data, this.getStatusConstraints())
            .then(data => {
                data = { ...data, time: new Date() };
                const newStatus = new this(data);

                Events.push(Events.event.newStatus, newStatus);

                console.log('[Status] Successfully added!');

                return newStatus;
            })
            .catch(errors => {
                console.log('[Status] Validation failed, throwing error.');

                throw {
                    message: 'The new status is not valid, please check the errors.',
                    errors: errors,
                };
            });
    }

    /**
     * This function should only be used when a previously created status
     * needs to become a status object again.
     *
     * const rawStatus = status.getRawData()
     * const status = Status.hydrateStatus(rawStatus)
     *
     * @param {Object} data
     */
    static hydrateStatus(data) {
        return new this(data);
    }

    updateJob(job) {
        if (validate(job, Status.getJobConstraints())) {
            console.log('[Status] Invalid job, not adding to status jobs.');
            return;
        }

        if (!this.data.jobs) {
            this.data.jobs = [job];
            return;
        }

        const existingJob = this.data.jobs.find(existingJob => existingJob.name === job.name);

        if (existingJob) {
            const index = this.data.jobs.indexOf(existingJob);
            this.data.jobs[index] = job;
            return;
        }

        this.data.jobs.push(job);
    }

    getRawData() {
        return this.data;
    }

    getKey() {
        return this.data.key;
    }

    getState() {
        return this.data.state;
    }

    isOld() {
        const expireTime = 7 * 24 * 60 * 60 * 1000;

        return new Date() - this.data.time < expireTime;
    }
}

module.exports = Status;
