import type { Model } from '../types';
import enJ from './en.json';
import itJ from './it.json';

export const MODELS: Record<string, Model> = {
    it: itJ,
    en: enJ,
};
