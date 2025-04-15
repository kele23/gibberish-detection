import type { Model } from '../types';
import enJ from './en.json';
import itJ from './it.json';
import allJ from './all.json';

export const MODELS: Record<string, Model> = {
    all: allJ,
    it: itJ,
    en: enJ,
};
