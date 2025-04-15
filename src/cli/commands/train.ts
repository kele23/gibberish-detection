import { defineCommand } from 'citty';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { resolve } from 'pathe';
import { train } from '../..';
import consola from 'consola';

const loadFile = async (file: string) => {
    const filePath = resolve(file);
    if (!existsSync(filePath)) {
        throw new Error('File not exists');
    }
    return await fs.readFile(filePath, 'utf8');
};

export default defineCommand({
    meta: {
        name: 'train',
        description: 'Train a new model',
    },
    args: {
        train: {
            type: 'string',
            description: 'The file with train data',
            required: true,
        },
        goodsm: {
            type: 'string',
            description: 'The file with some good sentences',
            required: true,
        },
        badsm: {
            type: 'string',
            description: 'The file with some bad sentences',
            required: true,
        },
        target: {
            type: 'string',
            description: 'The target file to save the model',
            required: true,
        },
    },
    async run({ args }) {
        try {
            const trainS = await loadFile(args.train);
            consola.info('Loaded ' + args.train);
            const goodsm = await loadFile(args.goodsm);
            consola.info('Loaded ' + args.goodsm);
            const badsm = await loadFile(args.badsm);
            consola.info('Loaded ' + args.badsm);

            const model = train(trainS, goodsm, badsm);
            await fs.writeFile(args.target, JSON.stringify(model), 'utf8');
            consola.info(`Completed train, file written into ${args.target}`);
        } catch (error_) {
            console.error(error_);
        }
    },
});
