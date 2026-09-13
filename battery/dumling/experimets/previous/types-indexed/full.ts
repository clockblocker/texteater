import type {Lemma,Surface,Reading,Unit,UnitKind} from './model.js';
export type All = Unit<UnitKind>;
export type AllLemmas = Lemma;
export type AllSurfaces = Surface;
export type AllReadings = Reading;
declare const x: Lemma;
if(x.language==='de' && x.family==='Lexeme' && x.kind==='NOUN') {
 const gender: 'Fem'|'Masc'|'Neut'|null = x.coreFeatures.gender;
}
declare const s: Surface;
if(s.lemma.language==='de' && s.lemma.family==='Lexeme' && s.lemma.kind==='NOUN' && s.surfaceKind==='Inflection') {
 // @ts-expect-error Nested lemma discriminant doesn't narrow surface siblings.
 const grammaticalCase = s.inflectionalFeatures.case;
}
function consume(x:All) { return x; }
