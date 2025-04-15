import { defineCommand } from 'citty';
import consola from 'consola';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { resolve } from 'pathe';
import {
    calculateThreshold,
    getGibberishScore,
    isValidModel
} from '../..';
import { MODELS } from '../../prebuild';
import type { Model } from '../../types';

export default defineCommand({
    meta: {
        name: 'test',
        description: 'Test if a file is a gibberish',
    },
    args: {
        text: {
            type: 'string',
            description: 'The text to check',
        },
        file: {
            type: 'string',
            description: 'The text file to check',
        },
        model: {
            type: 'string',
            description: 'The model name or the file of the model',
            required: true,
        },
    },
    async run({ args }) {
        let text = args.text;
        if (args.file) {
            const pathFile = resolve(args.file);
            text = await fs.readFile(pathFile, 'utf8');
        }

        if (!text) {
            consola.error('You not provided any text to check');
            return;
        }

        let model = MODELS[args.model];
        if (!model) {
            const pathFile = resolve(args.model);
            if (!existsSync(pathFile)) {
                consola.error('Cannot load model ' + model);
                return;
            }
            model = JSON.parse(await fs.readFile(pathFile, 'utf8')) as Model;
        }

        if (!isValidModel(model)) {
            consola.error('Loaded model is not valid ' + model);
            return;
        }

        const score = getGibberishScore(text, model);
        const threshold = calculateThreshold(model);
        const result = score <= threshold;
        if (result) {
            consola.warn(`Text is Gibberish ${score} / ${threshold}`);
        } else {
            consola.info(`Text is Valid ${score} / ${threshold}`);
        }
    },
});
