import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
    declaration: true,
    name: 'gibberish',
    entries: [
        { input: 'src/cli/index.ts' },
        { input: 'src/index.ts' },
        { input: 'src/types/index.ts' },
        { input: 'src/prebuild/index.ts' },
    ],
});
