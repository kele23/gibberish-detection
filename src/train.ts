import type { Model, XYPair } from './types';
import * as fs from 'node:fs/promises';

/**
 * Sanitizes a given text sample by removing line breaks, tabs, sentence terminators,
 * converting double spaces to single spaces, normalizing non-Latin characters,
 * and removing noise from the sample.
 *
 * @param {string} sample - The text sample to be sanitized.
 * @returns {string} - The sanitized text sample.
 */
export const sanitizeText = (sample: string = ''): string => {
    // remove all linebreaks, replace them with spaces
    sample = sample.split('\r\n').join(' ');
    sample = sample.split('\n').join(' ');
    sample = sample.split('\t').join(' ');

    // All sentence terminators (!,.,?,...,;) should be treated as whitespace
    // Here, we care about words and word boundaries, not sentence boundaries.
    // Put another way we want to see how often a letter might be the last letter of the word
    // This will essentially merge the count for "this letter at end of sentence" and "this letter at end of word" which serves the same effect.
    sample = sample.replace(/[!?.;]/g, ' ');

    // convert double spaces to single spaces
    sample = sample.replace(/\s+/g, ' ');

    // normalize the text to take care of non-latin characters
    sample = convertToLatinEquivalent(sample);

    // regex pattern to eliminate noise from the sample
    // const pattern = /[0-9!"#$%&'()*+,-./:;<=>?@[\]^_`{|}~]/g;
    // sample = sample.replace(pattern, '');

    return sample;
};

/**
 * Creates the training model using Markov Chaining that is later used to score suspect strings.
 * @param {String} sample A large block of "good" text where letter adjacency frequencies are calculated. This likely should be a long piece of literature
 * @param {String[]|String} goodLines A list of sentences that are example of "good" letter arrangements. These lines are individually scored to calculate a tolerance threshold.
 * @param {String[]|String} badLines A list of sentences that are example of "bad" letter arrangements (e.g., letter mashing) These lines are individually scored to calculate a tolerance threshold.
 * @returns {Model} The training model containing the the letter adjacency frequencies amd the baseline calculations for goodLines and badLines
 */
export const train = (
    sample: string,
    goodLines: string[] | string,
    badLines: string[] | string,
): Model => {
    sample = sanitizeText(sample);

    const split = [...sample.toLowerCase()];
    let analysis = [];
    const analysisCache = {} as Record<string, XYPair>;

    for (let x = 0; x < split.length; x++) {
        if (!split[x + 1]) {
            break;
        }
        const letterPair = String(split[x]) + String(split[x + 1]);

        // have we discovered this pair before?
        const existingFind = analysisCache[letterPair];

        if (existingFind) {
            existingFind.y++;
        } else {
            const newEntry = { x: letterPair, y: 1 };
            analysis.push(newEntry);
            analysisCache[letterPair] = newEntry;
        }
    }

    // sort the matrix by amount of hits descending. This should make searches against "good" samples complete a little faster than gibberish samples.
    analysis = analysis.sort((a, b) => b.y - a.y);

    const result = {
        matrix: analysis,
        baseline: { good: {}, bad: {} },
    } as Model;

    // convert a line-delimted string into an array
    if (!Array.isArray(goodLines))
        goodLines = goodLines.split('\n').map((x) => x.trim());
    if (!Array.isArray(badLines))
        badLines = badLines.split('\n').map((x) => x.trim());

    // get aggregate information about the good samples and bad samples to form the baselines (so threshold can later be calculated)
    result.baseline.good = scoreLines(goodLines, analysis);
    result.baseline.bad = scoreLines(badLines, analysis);

    return result;
};

/**
 * Converts a given string to its Latin equivalent by removing diacritics and non-Latin characters.
 *
 * @param {string} inputString - The input string to be converted.
 * @returns {string} - The Latin equivalent of the input string.
 */
export const convertToLatinEquivalent = (inputString: string): string => {
    // Remove diacritics using normalize
    const normalizedString = inputString
        .normalize('NFD')
        .replace(/[\u0300-\u036F]/g, '');

    // Use a regular expression to replace non-Latin characters
    const latinEquivalentString = normalizedString.replace(
        // eslint-disable-next-line no-control-regex
        /[^\u0000-\u007F]/g,
        '',
    );

    return latinEquivalentString;
};

/**
 * Converts a JSON array of objects into a JavaScript Map.
 * Each object in the array is expected to have 'x' and 'y' properties.
 * The 'x' property becomes the key in the Map, and the 'y' property becomes the value.
 *
 * @param {XYPair[]} jsonArray - The input JSON array to convert.
 * @returns {Map<string, number>} - A JavaScript Map object where the keys are the 'x' properties from the input array,
 * and the values are the 'y' properties from the input array.
 */
export const convertJSONMatrixIntoMap = (
    jsonArray: XYPair[],
): Map<string, number> => {
    const map = new Map();
    for (const item of jsonArray) {
        map.set(item.x, item.y);
    }
    return map;
};

/**
 * Returns the threshold that a test score must reach in order to determine that it's not likely gibberish
 * @param {Model} model The training model to score against
 * @returns {Number} The average of the "good minimum" and the "bad maximum"
 */
export const calculateThreshold = (model: Model): number =>
    (model.baseline.good.min! + model.baseline.bad.max!) / 2;

/**
 * Scores a series of lines against the model and returns an aggregate calculation of minimum score, maximum score, and average score.
 * @param {String[]} lines
 * @param {XYPair[]} matrix
 */
export const scoreLines = (
    lines: string[],
    matrix: XYPair[],
): { min: number; max: number; avg: number } => {
    const scores = lines.map((line) =>
        assignScore(String(line).trim(), matrix),
    );
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const average = scores.reduce((a, b) => a + b, 0) / scores.length;

    return { min, max, avg: average };
};

/**
 * Assesses a score of a suspect string
 * @param {String} test The string being scored
 * @param {XYPair[]} matrix The matrix aspect of the learning model that contains the letter adjacency frequencies
 * @param {Boolean} [useCache=true] Determines if caching should be used when a letter pair has been discovered from the training model. Setting to true is notably faster but could theoretically higher memory cost on tests against (much) longer strings
 * @returns {Number} The average letter-adjacency score of each letter pairing, derived from the training model
 */
export const assignScore = (
    test: string,
    matrix: XYPair[],
    useCache: boolean = true,
): number => {
    // Replace line breaks with spaces
    const sanitized = sanitizeText(test);
    test = String(sanitized).split('\n').join(' ');
    const modelCache = new Map();

    const split = [...test.toLowerCase()];
    let pairCount = 0;
    let totalScore = 0;

    const matrixMap = convertJSONMatrixIntoMap(matrix);

    for (let x = 0; x < split.length; x++) {
        // don't do anything if the letter is by itself (last letter of the sample)
        if (!split[x + 1]) {
            break;
        }

        const letterPair = `${split[x]}${split[x + 1]}`;
        let modelFind;

        if (useCache && modelCache.has(letterPair)) {
            modelFind = modelCache.get(letterPair);
        } else if (matrixMap.has(letterPair)) {
            modelFind = matrixMap.get(letterPair);
            if (useCache) {
                modelCache.set(letterPair, modelFind);
            }
        }

        pairCount++;

        // if match was found, add it to total score count
        if (modelFind) {
            totalScore += modelFind;
        }
    }

    // return average
    return totalScore / pairCount;
};

/**
 * Validates the structure of a matrix used in the learning model.
 * The matrix is expected to be an array of objects, each containing a pair of letters (x) and their frequency (y).
 *
 * @param {XYPair[]} matrix - The matrix to validate.
 * @returns {boolean} - Returns true if the matrix is valid, false otherwise.
 */
export const isValidMatrix = (matrix: XYPair[]): boolean => {
    if (!matrix || !Array.isArray(matrix)) return false;

    let errorState = false;

    matrix.some((m) => {
        if (typeof m !== 'object' || Array.isArray(m))
            return (errorState = true);

        if (typeof m.x != 'string' || m.x.length != 2)
            return (errorState = true);

        if (typeof m.y != 'number') return (errorState = true);
    });

    return !errorState;
};

/**
 * Tests for valid structure of a learning model
 * @param {{}} model
 */
export const isValidModel = (model: Model) => {
    if (!model || typeof model !== 'object' || Array.isArray(model))
        return false;

    if (!isValidMatrix(model.matrix)) return false;

    if (
        !model.baseline ||
        typeof model.baseline !== 'object' ||
        Array.isArray(model.baseline)
    )
        return false;

    if (
        !model.baseline.good ||
        typeof model.baseline.good !== 'object' ||
        Array.isArray(model.baseline.good)
    )
        return false;

    if (
        typeof model.baseline.good.min !== 'number' ||
        typeof model.baseline.good.max !== 'number' ||
        typeof model.baseline.good.avg !== 'number'
    )
        return false;

    if (
        !model.baseline.bad ||
        typeof model.baseline.bad !== 'object' ||
        Array.isArray(model.baseline.bad)
    )
        return false;

    if (
        typeof model.baseline.bad.min !== 'number' ||
        typeof model.baseline.bad.max !== 'number' ||
        typeof model.baseline.bad.avg !== 'number'
    )
        return false;

    return true;
};

/**
 *
 * @param goodSmFile The text good file for score
 * @param badSmFile The text bad file for score
 * @param goodFile The text train file
 */
export const trainWithFiles = async (
    goodSmFile: string,
    badSmFile: string,
    trainFile: string,
) => {
    const goodTst = await fs.readFile(goodSmFile, 'utf8');
    const badTst = await fs.readFile(badSmFile, 'utf8');
    const good = await fs.readFile(trainFile, 'utf8');

    return train(good, goodTst, badTst);
};
