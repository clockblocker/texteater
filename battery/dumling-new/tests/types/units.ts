import {
	type Lemma,
	parseUnit,
	type Reading,
	type Surface,
	type Unit,
	type UnitKind,
} from "../../src/index.js";

type Noun = Unit<"Lemma", "de", "Lexeme", "NOUN">;
declare const noun: Noun;
const _gender: "Fem" | "Masc" | "Neut" | null = noun.coreFeatures.gender;
const _tag: UnitKind = noun.unitKind;
// @ts-expect-error A Morpheme cannot be a NOUN.
type _WrongFamily = Lemma<"de", "Morpheme", "NOUN">;
// @ts-expect-error German has no ToneMarking route.
type _UnsupportedMorpheme = Lemma<"de", "Morpheme", "ToneMarking">;
declare const prefix: Surface<"de", "Morpheme", "Prefix">;
// @ts-expect-error A route without an inflectional bag has no Surface field.
prefix.inflectionalFeatures;
// @ts-expect-error English has no Collocation route.
type _WrongLanguage = Unit<"Reading", "en", "Phraseme", "Collocation">;
// @ts-expect-error German noun _gender is restricted.
const _wrongGender: "Com" = noun.coreFeatures.gender;
declare const reading: Reading<"de", "Lexeme", "NOUN">;
const _nested: Noun = reading.lemma;
declare const surface: Surface<"de", "Lexeme", "NOUN">;
const _inflection: {
	case: "Acc" | "Dat" | "Gen" | "Nom" | null;
	number: "Plur" | "Sing" | null;
} | null = surface.inflectionalFeatures;
// @ts-expect-error Surface Kind is assessed separately.
surface.surfaceKind;
const selected = parseUnit(null, {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
});
if (selected.success) {
	const _exact: Noun = selected.chain.value;
}
// @ts-expect-error Expected coordinates remain correlated.
parseUnit(null, {
	unitKind: "Lemma",
	language: "en",
	family: "Phraseme",
	kind: "Collocation",
});
const broad = parseUnit(null);
if (broad.success) {
	const chain = broad.chain;
	if (
		chain.unitKind === "Lemma" &&
		chain.language === "de" &&
		chain.family === "Lexeme" &&
		chain.kind === "NOUN"
	) {
		const _exact: Noun = chain.value;
	}
}
