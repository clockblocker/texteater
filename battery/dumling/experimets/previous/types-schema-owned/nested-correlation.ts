type Noun = { language: 'de'; family: 'Lexeme'; kind: 'NOUN'; coreFeatures: { gender: 'Fem'|'Masc'|'Neut'|null } };
type Verb = { language: 'de'; family: 'Lexeme'; kind: 'VERB'; coreFeatures: { verbType: 'Mod'|null } };
type NounSurface = { lemma: Noun; surfaceKind: 'Inflection'; inflectionalFeatures: { case: 'Nom'|'Acc'|null } };
type VerbSurface = { lemma: Verb; surfaceKind: 'Inflection'; inflectionalFeatures: { tense: 'Pres'|'Past'|null } };
declare const surface: NounSurface | VerbSurface;
if (surface.lemma.kind === 'NOUN') {
  const gender = surface.lemma.coreFeatures.gender;
  // @ts-expect-error A nested lemma discriminator doesn't narrow the containing Surface.
  const grammaticalCase = surface.inflectionalFeatures.case;
}
declare const result: { chain: { kind: 'NOUN' }; value: NounSurface } | { chain: { kind: 'VERB' }; value: VerbSurface };
if (result.chain.kind === 'NOUN') {
  // @ts-expect-error Nested chain discriminator doesn't narrow sibling value either.
  const grammaticalCase = result.value.inflectionalFeatures.case;
}
declare const flat: { kind: 'NOUN'; value: NounSurface } | { kind: 'VERB'; value: VerbSurface };
if (flat.kind === 'NOUN') {
  const grammaticalCase = flat.value.inflectionalFeatures.case;
}
declare function isNounSurface(value: NounSurface|VerbSurface): value is NounSurface;
if (isNounSurface(surface)) {
  const grammaticalCase = surface.inflectionalFeatures.case;
}
// Container of leaf union is often sufficient for Reading, because there are no dependent sibling fields.
type Reading = { lemma: Noun|Verb; emojiDescription: string };
declare const reading: Reading;
if (reading.lemma.kind === 'NOUN') {
  const gender = reading.lemma.coreFeatures.gender;
}
