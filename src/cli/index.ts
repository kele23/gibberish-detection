#!/usr/bin/env node
import { defineCommand, runMain } from 'citty';
import { version } from '../../package.json';

const main = defineCommand({
	meta: {
		name: 'gibberish',
		description: 'Gibberish CLI',
		version: version,
	},
	subCommands: {
		train: () => import('./commands/train').then((r) => r.default),
		test: () => import('./commands/test').then((r) => r.default),
	},
});

runMain(main);
