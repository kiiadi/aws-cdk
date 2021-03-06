import cdk = require('@aws-cdk/cdk');
import { Test } from 'nodeunit';
import codepipeline = require('../lib');
import { validateArtifactBounds, validateSourceAction } from '../lib/validation';

// tslint:disable:object-literal-key-quotes

class TestAction extends codepipeline.Action {}

export = {
    'artifact bounds validation': {

        'artifacts count exceed maximum'(test: Test) {
            const result = boundsValidationResult(1, 0, 0);
            test.deepEqual(result.length, 1);
            test.ok(result[0].match(/cannot have more than 0/), 'the validation should have failed');
            test.done();
        },

        'artifacts count below minimum'(test: Test) {
            const result = boundsValidationResult(1, 2, 2);
            test.deepEqual(result.length, 1);
            test.ok(result[0].match(/must have at least 2/), 'the validation should have failed');
            test.done();
        },

        'artifacts count within bounds'(test: Test) {
            const result = boundsValidationResult(1, 0, 2);
            test.deepEqual(result.length, 0);
            test.done();
        },
    },

    'action type validation': {

        'must be source and is source'(test: Test) {
            const result = validateSourceAction(true, codepipeline.ActionCategory.Source, 'test action', 'test stage');
            test.deepEqual(result.length, 0);
            test.done();
        },

        'must be source and is not source'(test: Test) {
            const result = validateSourceAction(true, codepipeline.ActionCategory.Deploy, 'test action', 'test stage');
            test.deepEqual(result.length, 1);
            test.ok(result[0].match(/may only contain Source actions/), 'the validation should have failed');
            test.done();
        },

        'cannot be source and is source'(test: Test) {
            const result = validateSourceAction(false, codepipeline.ActionCategory.Source, 'test action', 'test stage');
            test.deepEqual(result.length, 1);
            test.ok(result[0].match(/may only occur in first stage/), 'the validation should have failed');
            test.done();
        },

        'cannot be source and is not source'(test: Test) {
            const result = validateSourceAction(false, codepipeline.ActionCategory.Deploy, 'test action', 'test stage');
            test.deepEqual(result.length, 0);
            test.done();
        },
    },

    'standard action with artifacts'(test: Test) {
        const stage = stageForTesting();
        const action = new TestAction(stage, 'TestAction', {
            artifactBounds: defaultBounds(),
            category: codepipeline.ActionCategory.Source,
            provider: 'test provider',
            configuration: { blah: 'bleep' }
        });
        new codepipeline.Artifact(action, 'TestOutput');

        test.deepEqual(action.render(), {
            name: 'TestAction',
            inputArtifacts: [],
            actionTypeId:
                {
                    category: 'Source',
                    version: '1',
                    owner: 'AWS',
                    provider: 'test provider'
                },
            configuration: { blah: 'bleep' },
            outputArtifacts: [{ name: 'TestOutput' }],
            runOrder: 1
        });
        test.done();
    }
};

function boundsValidationResult(numberOfArtifacts: number, min: number, max: number): string[] {
    const stage = stageForTesting();
    const action = new TestAction(stage, 'TestAction', {
        artifactBounds: defaultBounds(),
        category: codepipeline.ActionCategory.Test,
        provider: 'test provider'
    });
    const artifacts: codepipeline.Artifact[] = [];
    for (let i = 0; i < numberOfArtifacts; i++) {
        artifacts.push(new codepipeline.Artifact(action, `TestArtifact${i}`));
    }
    return validateArtifactBounds('output', artifacts, min, max, 'testCategory', 'testProvider');
}

function stageForTesting(): codepipeline.Stage {
    const stack = new cdk.Stack();
    const pipeline = new codepipeline.Pipeline(stack, 'pipeline');
    return new codepipeline.Stage(pipeline, 'stage');
}

function defaultBounds(): codepipeline.ActionArtifactBounds {
    return {
        minInputs: 0,
        maxInputs: 5,
        minOutputs: 0,
        maxOutputs: 5
    };
}
