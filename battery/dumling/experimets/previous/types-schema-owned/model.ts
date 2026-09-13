import { z } from "../../../../../node_modules/zod/index.js";
import type { DeConstructionFusionFeatureBagsSchema as S0 } from "../../../src/schemas/concrete-language/de/construction/fusion.js";
import type { DeAdjectiveFeatureBagsSchema as S1 } from "../../../src/schemas/concrete-language/de/lexeme/adjective.js";
import type { DeAdpositionFeatureBagsSchema as S2 } from "../../../src/schemas/concrete-language/de/lexeme/adposition.js";
import type { DeAdverbFeatureBagsSchema as S3 } from "../../../src/schemas/concrete-language/de/lexeme/adverb.js";
import type { DeAuxiliaryFeatureBagsSchema as S4 } from "../../../src/schemas/concrete-language/de/lexeme/auxiliary.js";
import type { DeCoordinatingConjunctionFeatureBagsSchema as S5 } from "../../../src/schemas/concrete-language/de/lexeme/coordinating-conjunction.js";
import type { DeDeterminerFeatureBagsSchema as S6 } from "../../../src/schemas/concrete-language/de/lexeme/determiner.js";
import type { DeInterjectionFeatureBagsSchema as S7 } from "../../../src/schemas/concrete-language/de/lexeme/interjection.js";
import type { DeNounFeatureBagsSchema as S8 } from "../../../src/schemas/concrete-language/de/lexeme/noun.js";
import type { DeNumeralFeatureBagsSchema as S9 } from "../../../src/schemas/concrete-language/de/lexeme/numeral.js";
import type { DeOtherFeatureBagsSchema as S10 } from "../../../src/schemas/concrete-language/de/lexeme/other.js";
import type { DeParticleFeatureBagsSchema as S11 } from "../../../src/schemas/concrete-language/de/lexeme/particle.js";
import type { DePronounFeatureBagsSchema as S12 } from "../../../src/schemas/concrete-language/de/lexeme/pronoun.js";
import type { DeProperNounFeatureBagsSchema as S13 } from "../../../src/schemas/concrete-language/de/lexeme/proper-noun.js";
import type { DePunctuationFeatureBagsSchema as S14 } from "../../../src/schemas/concrete-language/de/lexeme/punctuation.js";
import type { DeSubordinatingConjunctionFeatureBagsSchema as S15 } from "../../../src/schemas/concrete-language/de/lexeme/subordinating-conjunction.js";
import type { DeSymbolFeatureBagsSchema as S16 } from "../../../src/schemas/concrete-language/de/lexeme/symbol.js";
import type { DeVerbFeatureBagsSchema as S17 } from "../../../src/schemas/concrete-language/de/lexeme/verb.js";
import type { DeCircumfixMorphemeFeatureBagsSchema as S18 } from "../../../src/schemas/concrete-language/de/morpheme/circumfix.js";
import type { DeCliticMorphemeFeatureBagsSchema as S19 } from "../../../src/schemas/concrete-language/de/morpheme/clitic.js";
import type { DeDuplifixMorphemeFeatureBagsSchema as S20 } from "../../../src/schemas/concrete-language/de/morpheme/duplifix.js";
import type { DeInfixMorphemeFeatureBagsSchema as S21 } from "../../../src/schemas/concrete-language/de/morpheme/infix.js";
import type { DeInterfixMorphemeFeatureBagsSchema as S22 } from "../../../src/schemas/concrete-language/de/morpheme/interfix.js";
import type { DePrefixMorphemeFeatureBagsSchema as S23 } from "../../../src/schemas/concrete-language/de/morpheme/prefix.js";
import type { DeRootMorphemeFeatureBagsSchema as S24 } from "../../../src/schemas/concrete-language/de/morpheme/root.js";
import type { DeSuffixMorphemeFeatureBagsSchema as S25 } from "../../../src/schemas/concrete-language/de/morpheme/suffix.js";
import type { DeSuffixoidMorphemeFeatureBagsSchema as S26 } from "../../../src/schemas/concrete-language/de/morpheme/suffixoid.js";
import type { DeToneMarkingMorphemeFeatureBagsSchema as S27 } from "../../../src/schemas/concrete-language/de/morpheme/tone-marking.js";
import type { DeTransfixMorphemeFeatureBagsSchema as S28 } from "../../../src/schemas/concrete-language/de/morpheme/transfix.js";
import type { DeAphorismPhrasemeFeatureBagsSchema as S29 } from "../../../src/schemas/concrete-language/de/phraseme/aphorism.js";
import type { DeCollocationPhrasemeFeatureBagsSchema as S30 } from "../../../src/schemas/concrete-language/de/phraseme/collocation.js";
import type { DeDiscourseFormulaPhrasemeFeatureBagsSchema as S31 } from "../../../src/schemas/concrete-language/de/phraseme/discourse-formula.js";
import type { DeIdiomPhrasemeFeatureBagsSchema as S32 } from "../../../src/schemas/concrete-language/de/phraseme/idiom.js";
import type { DeProverbPhrasemeFeatureBagsSchema as S33 } from "../../../src/schemas/concrete-language/de/phraseme/proverb.js";
import type { EnConstructionFusionFeatureBagsSchema as S34 } from "../../../src/schemas/concrete-language/en/construction/fusion.js";
import type { EnAdjectiveFeatureBagsSchema as S35 } from "../../../src/schemas/concrete-language/en/lexeme/adjective.js";
import type { EnAdpositionFeatureBagsSchema as S36 } from "../../../src/schemas/concrete-language/en/lexeme/adposition.js";
import type { EnAdverbFeatureBagsSchema as S37 } from "../../../src/schemas/concrete-language/en/lexeme/adverb.js";
import type { EnAuxiliaryFeatureBagsSchema as S38 } from "../../../src/schemas/concrete-language/en/lexeme/auxiliary.js";
import type { EnCoordinatingConjunctionFeatureBagsSchema as S39 } from "../../../src/schemas/concrete-language/en/lexeme/coordinating-conjunction.js";
import type { EnDeterminerFeatureBagsSchema as S40 } from "../../../src/schemas/concrete-language/en/lexeme/determiner.js";
import type { EnInterjectionFeatureBagsSchema as S41 } from "../../../src/schemas/concrete-language/en/lexeme/interjection.js";
import type { EnNounFeatureBagsSchema as S42 } from "../../../src/schemas/concrete-language/en/lexeme/noun.js";
import type { EnNumeralFeatureBagsSchema as S43 } from "../../../src/schemas/concrete-language/en/lexeme/numeral.js";
import type { EnOtherFeatureBagsSchema as S44 } from "../../../src/schemas/concrete-language/en/lexeme/other.js";
import type { EnParticleFeatureBagsSchema as S45 } from "../../../src/schemas/concrete-language/en/lexeme/particle.js";
import type { EnPronounFeatureBagsSchema as S46 } from "../../../src/schemas/concrete-language/en/lexeme/pronoun.js";
import type { EnProperNounFeatureBagsSchema as S47 } from "../../../src/schemas/concrete-language/en/lexeme/proper-noun.js";
import type { EnPunctuationFeatureBagsSchema as S48 } from "../../../src/schemas/concrete-language/en/lexeme/punctuation.js";
import type { EnSubordinatingConjunctionFeatureBagsSchema as S49 } from "../../../src/schemas/concrete-language/en/lexeme/subordinating-conjunction.js";
import type { EnSymbolFeatureBagsSchema as S50 } from "../../../src/schemas/concrete-language/en/lexeme/symbol.js";
import type { EnVerbFeatureBagsSchema as S51 } from "../../../src/schemas/concrete-language/en/lexeme/verb.js";
import type { EnCircumfixMorphemeFeatureBagsSchema as S52 } from "../../../src/schemas/concrete-language/en/morpheme/circumfix.js";
import type { EnCliticMorphemeFeatureBagsSchema as S53 } from "../../../src/schemas/concrete-language/en/morpheme/clitic.js";
import type { EnDuplifixMorphemeFeatureBagsSchema as S54 } from "../../../src/schemas/concrete-language/en/morpheme/duplifix.js";
import type { EnInfixMorphemeFeatureBagsSchema as S55 } from "../../../src/schemas/concrete-language/en/morpheme/infix.js";
import type { EnInterfixMorphemeFeatureBagsSchema as S56 } from "../../../src/schemas/concrete-language/en/morpheme/interfix.js";
import type { EnPrefixMorphemeFeatureBagsSchema as S57 } from "../../../src/schemas/concrete-language/en/morpheme/prefix.js";
import type { EnRootMorphemeFeatureBagsSchema as S58 } from "../../../src/schemas/concrete-language/en/morpheme/root.js";
import type { EnSuffixMorphemeFeatureBagsSchema as S59 } from "../../../src/schemas/concrete-language/en/morpheme/suffix.js";
import type { EnSuffixoidMorphemeFeatureBagsSchema as S60 } from "../../../src/schemas/concrete-language/en/morpheme/suffixoid.js";
import type { EnToneMarkingMorphemeFeatureBagsSchema as S61 } from "../../../src/schemas/concrete-language/en/morpheme/tone-marking.js";
import type { EnTransfixMorphemeFeatureBagsSchema as S62 } from "../../../src/schemas/concrete-language/en/morpheme/transfix.js";
import type { EnAphorismPhrasemeFeatureBagsSchema as S63 } from "../../../src/schemas/concrete-language/en/phraseme/aphorism.js";
import type { EnDiscourseFormulaPhrasemeFeatureBagsSchema as S64 } from "../../../src/schemas/concrete-language/en/phraseme/discourse-formula.js";
import type { EnIdiomPhrasemeFeatureBagsSchema as S65 } from "../../../src/schemas/concrete-language/en/phraseme/idiom.js";
import type { EnProverbPhrasemeFeatureBagsSchema as S66 } from "../../../src/schemas/concrete-language/en/phraseme/proverb.js";
import type { HeConstructionFusionFeatureBagsSchema as S67 } from "../../../src/schemas/concrete-language/he/construction/fusion.js";
import type { HeAdjectiveFeatureBagsSchema as S68 } from "../../../src/schemas/concrete-language/he/lexeme/adjective.js";
import type { HeAdpositionFeatureBagsSchema as S69 } from "../../../src/schemas/concrete-language/he/lexeme/adposition.js";
import type { HeAdverbFeatureBagsSchema as S70 } from "../../../src/schemas/concrete-language/he/lexeme/adverb.js";
import type { HeAuxiliaryFeatureBagsSchema as S71 } from "../../../src/schemas/concrete-language/he/lexeme/auxiliary.js";
import type { HeCoordinatingConjunctionFeatureBagsSchema as S72 } from "../../../src/schemas/concrete-language/he/lexeme/coordinating-conjunction.js";
import type { HeDeterminerFeatureBagsSchema as S73 } from "../../../src/schemas/concrete-language/he/lexeme/determiner.js";
import type { HeInterjectionFeatureBagsSchema as S74 } from "../../../src/schemas/concrete-language/he/lexeme/interjection.js";
import type { HeNounFeatureBagsSchema as S75 } from "../../../src/schemas/concrete-language/he/lexeme/noun.js";
import type { HeNumeralFeatureBagsSchema as S76 } from "../../../src/schemas/concrete-language/he/lexeme/numeral.js";
import type { HeOtherFeatureBagsSchema as S77 } from "../../../src/schemas/concrete-language/he/lexeme/other.js";
import type { HeParticleFeatureBagsSchema as S78 } from "../../../src/schemas/concrete-language/he/lexeme/particle.js";
import type { HePronounFeatureBagsSchema as S79 } from "../../../src/schemas/concrete-language/he/lexeme/pronoun.js";
import type { HeProperNounFeatureBagsSchema as S80 } from "../../../src/schemas/concrete-language/he/lexeme/proper-noun.js";
import type { HePunctuationFeatureBagsSchema as S81 } from "../../../src/schemas/concrete-language/he/lexeme/punctuation.js";
import type { HeSubordinatingConjunctionFeatureBagsSchema as S82 } from "../../../src/schemas/concrete-language/he/lexeme/subordinating-conjunction.js";
import type { HeSymbolFeatureBagsSchema as S83 } from "../../../src/schemas/concrete-language/he/lexeme/symbol.js";
import type { HeVerbFeatureBagsSchema as S84 } from "../../../src/schemas/concrete-language/he/lexeme/verb.js";
import type { HeCircumfixMorphemeFeatureBagsSchema as S85 } from "../../../src/schemas/concrete-language/he/morpheme/circumfix.js";
import type { HeCliticMorphemeFeatureBagsSchema as S86 } from "../../../src/schemas/concrete-language/he/morpheme/clitic.js";
import type { HeDuplifixMorphemeFeatureBagsSchema as S87 } from "../../../src/schemas/concrete-language/he/morpheme/duplifix.js";
import type { HeInfixMorphemeFeatureBagsSchema as S88 } from "../../../src/schemas/concrete-language/he/morpheme/infix.js";
import type { HeInterfixMorphemeFeatureBagsSchema as S89 } from "../../../src/schemas/concrete-language/he/morpheme/interfix.js";
import type { HePrefixMorphemeFeatureBagsSchema as S90 } from "../../../src/schemas/concrete-language/he/morpheme/prefix.js";
import type { HeRootMorphemeFeatureBagsSchema as S91 } from "../../../src/schemas/concrete-language/he/morpheme/root.js";
import type { HeSuffixMorphemeFeatureBagsSchema as S92 } from "../../../src/schemas/concrete-language/he/morpheme/suffix.js";
import type { HeSuffixoidMorphemeFeatureBagsSchema as S93 } from "../../../src/schemas/concrete-language/he/morpheme/suffixoid.js";
import type { HeToneMarkingMorphemeFeatureBagsSchema as S94 } from "../../../src/schemas/concrete-language/he/morpheme/tone-marking.js";
import type { HeTransfixMorphemeFeatureBagsSchema as S95 } from "../../../src/schemas/concrete-language/he/morpheme/transfix.js";
import type { HeAphorismPhrasemeFeatureBagsSchema as S96 } from "../../../src/schemas/concrete-language/he/phraseme/aphorism.js";
import type { HeDiscourseFormulaPhrasemeFeatureBagsSchema as S97 } from "../../../src/schemas/concrete-language/he/phraseme/discourse-formula.js";
import type { HeIdiomPhrasemeFeatureBagsSchema as S98 } from "../../../src/schemas/concrete-language/he/phraseme/idiom.js";
import type { HeProverbPhrasemeFeatureBagsSchema as S99 } from "../../../src/schemas/concrete-language/he/phraseme/proverb.js";
type Registry = {
 de: {
  Construction: { Fusion: typeof S0; };
  Lexeme: { ADJ: typeof S1; ADP: typeof S2; ADV: typeof S3; AUX: typeof S4; CCONJ: typeof S5; DET: typeof S6; INTJ: typeof S7; NOUN: typeof S8; NUM: typeof S9; X: typeof S10; PART: typeof S11; PRON: typeof S12; PROPN: typeof S13; PUNCT: typeof S14; SCONJ: typeof S15; SYM: typeof S16; VERB: typeof S17; };
  Morpheme: { Circumfix: typeof S18; Clitic: typeof S19; Duplifix: typeof S20; Infix: typeof S21; Interfix: typeof S22; Prefix: typeof S23; Root: typeof S24; Suffix: typeof S25; Suffixoid: typeof S26; ToneMarking: typeof S27; Transfix: typeof S28; };
  Phraseme: { Aphorism: typeof S29; Collocation: typeof S30; DiscourseFormula: typeof S31; Idiom: typeof S32; Proverb: typeof S33; };
 };
 en: {
  Construction: { Fusion: typeof S34; };
  Lexeme: { ADJ: typeof S35; ADP: typeof S36; ADV: typeof S37; AUX: typeof S38; CCONJ: typeof S39; DET: typeof S40; INTJ: typeof S41; NOUN: typeof S42; NUM: typeof S43; X: typeof S44; PART: typeof S45; PRON: typeof S46; PROPN: typeof S47; PUNCT: typeof S48; SCONJ: typeof S49; SYM: typeof S50; VERB: typeof S51; };
  Morpheme: { Circumfix: typeof S52; Clitic: typeof S53; Duplifix: typeof S54; Infix: typeof S55; Interfix: typeof S56; Prefix: typeof S57; Root: typeof S58; Suffix: typeof S59; Suffixoid: typeof S60; ToneMarking: typeof S61; Transfix: typeof S62; };
  Phraseme: { Aphorism: typeof S63; DiscourseFormula: typeof S64; Idiom: typeof S65; Proverb: typeof S66; };
 };
 he: {
  Construction: { Fusion: typeof S67; };
  Lexeme: { ADJ: typeof S68; ADP: typeof S69; ADV: typeof S70; AUX: typeof S71; CCONJ: typeof S72; DET: typeof S73; INTJ: typeof S74; NOUN: typeof S75; NUM: typeof S76; X: typeof S77; PART: typeof S78; PRON: typeof S79; PROPN: typeof S80; PUNCT: typeof S81; SCONJ: typeof S82; SYM: typeof S83; VERB: typeof S84; };
  Morpheme: { Circumfix: typeof S85; Clitic: typeof S86; Duplifix: typeof S87; Infix: typeof S88; Interfix: typeof S89; Prefix: typeof S90; Root: typeof S91; Suffix: typeof S92; Suffixoid: typeof S93; ToneMarking: typeof S94; Transfix: typeof S95; };
  Phraseme: { Aphorism: typeof S96; DiscourseFormula: typeof S97; Idiom: typeof S98; Proverb: typeof S99; };
 };
};

type Language = keyof Registry;
type Family<L extends Language> = L extends Language ? keyof Registry[L] : never;
type Kind<L extends Language, F extends Family<L>> = L extends Language ? F extends keyof Registry[L] ? keyof Registry[L][F] : never : never;
type UnitKind = 'Lemma' | 'Surface' | 'Reading' | 'Attestation';
function lemmaSchema<L extends string, F extends string, K extends string, C extends z.core.$ZodType>(language: L, family: F, kind: K, core: C) {
 return z.strictObject({ unitKind: z.literal('Lemma'), language: z.literal(language), family: z.literal(family), kind: z.literal(kind), canonicalForm: z.string().trim().min(1), coreFeatures: core });
}
type SchemaAt<L extends Language, F extends Family<L>, K extends Kind<L,F>> = F extends keyof Registry[L] ? K extends keyof Registry[L][F] ? Registry[L][F][K] : never : never;
type BagsAt<L extends Language,F extends Family<L>,K extends Kind<L,F>> = SchemaAt<L,F,K> extends z.ZodType ? z.output<SchemaAt<L,F,K>> : never;
type CoreSchemaAt<L extends Language,F extends Family<L>,K extends Kind<L,F>> = SchemaAt<L,F,K> extends { shape: { core: infer C extends z.core.$ZodType } } ? C : never;
type LemmaAt<L extends Language,F extends Family<L>,K extends Kind<L,F>> = z.output<ReturnType<typeof lemmaSchema<L, F & string,K & string,CoreSchemaAt<L,F,K>>>>;
function citationSurfaceSchema<L extends z.core.$ZodType>(lemma:L) {
 return z.strictObject({unitKind:z.literal('Surface'),lemma,normalizedSurface:z.string().trim().min(1),spelling:z.enum(['Canonical','Variant']),surfaceKind:z.literal('Citation')});
}
function inflectionSurfaceSchema<L extends z.core.$ZodType,I extends z.core.$ZodType>(lemma:L, inflectionalFeatures:I) {
 return z.strictObject({unitKind:z.literal('Surface'),lemma,normalizedSurface:z.string().trim().min(1),spelling:z.enum(['Canonical','Variant']),surfaceKind:z.literal('Inflection'),inflectionalFeatures});
}
function readingSchema<L extends z.core.$ZodType>(lemma:L) {
 return z.strictObject({unitKind:z.literal('Reading'),lemma,emojiDescription:z.string().trim().min(1)});
}
function attestationSchema<S extends z.core.$ZodType>(surface:S) {
 const member=z.strictObject({attested:z.string().min(1),orthography:z.enum(['Canonical','Variant'])});
 return z.strictObject({unitKind:z.literal('Attestation'),surface,members:z.tuple([member]).rest(member),realizationCoverage:z.enum(['Full','Partial'])});
}
type InflectionalSchemaAt<L extends Language,F extends Family<L>,K extends Kind<L,F>> = SchemaAt<L,F,K> extends {shape:{inflectional:infer I extends z.core.$ZodType}} ? I : never;
type LemmaSchemaAt<L extends Language,F extends Family<L>,K extends Kind<L,F>> = ReturnType<typeof lemmaSchema<L,F & string,K & string,CoreSchemaAt<L,F,K>>>;
type SurfaceSchemaAt<L extends Language,F extends Family<L>,K extends Kind<L,F>> = ReturnType<typeof citationSurfaceSchema<LemmaSchemaAt<L,F,K>>> | (keyof z.output<InflectionalSchemaAt<L,F,K>> extends never ? never : ReturnType<typeof inflectionSurfaceSchema<LemmaSchemaAt<L,F,K>,InflectionalSchemaAt<L,F,K>>>);
type AttestationFrom<S> = S extends z.core.$ZodType ? ReturnType<typeof attestationSchema<S>> : never;
type UnitAt<U extends UnitKind,L extends Language,F extends Family<L>,K extends Kind<L,F>> = z.output<{
 Lemma: LemmaSchemaAt<L,F,K>;
 Surface: SurfaceSchemaAt<L,F,K>;
 Reading: ReturnType<typeof readingSchema<LemmaSchemaAt<L,F,K>>>;
 Attestation: AttestationFrom<SurfaceSchemaAt<L,F,K>>;
}[U]>;
export type DumlingUnit<U extends UnitKind = UnitKind,L extends Language = Language,F extends Family<L> = Family<L>,K extends Kind<L,F> = Kind<L,F>> = L extends Language ? F extends Family<L> ? K extends Kind<L,F> ? UnitAt<U,L,F,K> : never : never : never;
export type Noun = DumlingUnit<'Lemma','de','Lexeme','NOUN'>;
const noun: Noun = {unitKind:'Lemma', language:'de',family:'Lexeme',kind:'NOUN',canonicalForm:'Haus',coreFeatures:{gender:'Neut',hyph:null}};
// @ts-expect-error unsupported route
export type InvalidFamily = DumlingUnit<'Lemma','en','Unknown','NOUN'>;
// @ts-expect-error wrong kind for family
export type InvalidKind = DumlingUnit<'Lemma','de','Lexeme','Fusion'>;
// @ts-expect-error lexical core feature mismatch
const badCore: Noun = {...noun,coreFeatures:{gender:'Common',hyph:null}};
type NoInflection = Extract<DumlingUnit<'Surface','de','Lexeme','ADP'>,{surfaceKind:'Inflection'}>;
// @ts-expect-error invariant route has no inflection Surface
const impossible: NoInflection = {};
type Envelope = { [L in Language]: { [F in Family<L>]: { [K in Kind<L,F>]: { [U in UnitKind]: { unitKind:U;language:L;family:F;kind:K;value:UnitAt<U,L,F,K> } }[UnitKind] }[Kind<L,F>] }[Family<L>] }[Language];
declare const parsed: Envelope;
if(parsed.unitKind === 'Lemma' && parsed.language === 'de' && parsed.kind === 'NOUN') {
 const gender: 'Fem'|'Masc'|'Neut'|null = parsed.value.coreFeatures.gender;
 // @ts-expect-error noun hyph is not generic boolean
 const hyph: boolean = parsed.value.coreFeatures.hyph;
}

const reading: DumlingUnit<'Reading','de','Lexeme','NOUN'> = {unitKind:'Reading',lemma:noun,emojiDescription:'🏠'};
// @ts-expect-error nested lemma retains exact features
const badReading: DumlingUnit<'Reading','de','Lexeme','NOUN'> = {unitKind:'Reading',lemma:{...noun,coreFeatures:{gender:'Wrong',hyph:null}},emojiDescription:'🏠'};
const citation: DumlingUnit<'Surface','de','Lexeme','NOUN'> = {unitKind:'Surface',lemma:noun,normalizedSurface:'Haus',spelling:'Canonical',surfaceKind:'Citation'};
const attestation: DumlingUnit<'Attestation','de','Lexeme','NOUN'> = {unitKind:'Attestation',surface:citation,members:[{attested:'Haus',orthography:'Canonical'}],realizationCoverage:'Full'};
// @ts-expect-error attestation members nonempty
const badAttestation: DumlingUnit<'Attestation','de','Lexeme','NOUN'> = {...attestation,members:[]};
const inflection: DumlingUnit<'Surface','de','Lexeme','NOUN'> = {...citation,surfaceKind:'Inflection',inflectionalFeatures:{case:'Dat',number:'Plur'}};
// @ts-expect-error exact Inflectional Features
const badInflection: DumlingUnit<'Surface','de','Lexeme','NOUN'> = {...citation,surfaceKind:'Inflection',inflectionalFeatures:{case:'Voc',number:'Plur'}};
export const allValues = parsed.value;
export const allUnits: DumlingUnit = allValues;
