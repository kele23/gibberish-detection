import { assignScore, calculateThreshold } from './train';
import type { Model } from './types';

/**
 *
 * @param {String} test The suspect string
 * @param {Model} model
 * @param {function} thresholdFn The function that calculates the minimum score before gibberish is declared
 * @param {Boolean} [useCache=true] Determines if caching should be used when a letter pair has been discovered from the training model. Setting to true is notably faster but could theoretically higher memory cost on tests against (much) longer strings
 */
export const testGibberish = (
    test: string,
    model: Model,
    thresholdFn?: (model: Model) => number,
    useCache: boolean = true,
) => {
    thresholdFn = thresholdFn || calculateThreshold;
    const score = assignScore(test, model.matrix, useCache);
    const threshold = thresholdFn(model);
    return score <= threshold;
};

/**
 *
 * @param {String} test The suspect string
 * @param {Model} model
 * @param {Boolean} [useCache=true] Determines if caching should be used when a letter pair has been discovered from the training model. Setting to true is notably faster but could theoretically higher memory cost on tests against (much) longer strings
 */
export const getGibberishScore = (
    test: string,
    model: Model,
    useCache: boolean = true,
) => {
    const score = assignScore(test, model.matrix, useCache);
    return score;
};

export {
    calculateThreshold,
    isValidModel,
    train,
    trainWithFiles
} from './train';

