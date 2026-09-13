import type {AbstractUnit,AbstractLemma,AbstractSurface} from './model.js';
export type All = AbstractUnit;
export type Lemmas=AbstractLemma;
export type Surfaces=AbstractSurface;
function consume(x:All) { return x; }
