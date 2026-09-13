import type {Lemma,Surface,Reading,Unit} from './model.js';
export type DeNoun = Lemma<'de','Lexeme','NOUN'>;
export type DeNounSurface = Surface<'de','Lexeme','NOUN'>;
export type DeNounReading = Reading<'de','Lexeme','NOUN'>;
declare const x: DeNoun;
const gender: 'Fem'|'Masc'|'Neut'|null = x.coreFeatures.gender;
// @ts-expect-error Wrong family/kind pair.
type Bad = Lemma<'de','Morpheme','NOUN'>;
// @ts-expect-error Collocation only in German registry.
type BadEn = Lemma<'en','Phraseme','Collocation'>;
