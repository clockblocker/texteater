import { parseUnit } from "../../src/index.js";
import type {
	Lemma,
	Reading,
	Surface,
	Unit,
	UnitKind,
} from "../../src/types.js";

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
// @ts-expect-error Hebrew has no Locution VERB route.
type _WrongLanguage = Unit<"Reading", "he", "Locution", "VERB">;
// @ts-expect-error A Saying Kind is Saying, never a part of speech.
type _WrongSayingKind = Lemma<"de", "Saying", "INTJ">;
// A Kind repeats across Families: Lexeme VERB and Locution VERB are two routes.
declare const locution: Lemma<"de", "Locution", "VERB">;
const _locutionFamily: "Locution" = locution.family;
const _locutionCore: Record<string, never> = locution.coreFeatures;
declare const locutionNoun: Lemma<"de", "Locution", "NOUN">;
const _locutionGender: "Fem" | "Masc" | "Neut" | null =
	locutionNoun.coreFeatures.gender;
// A NOUN Locution may own its article (ADR 0040, amended 2026-10-02).
declare const locutionNounOccurrence: Unit<
	"Attestation",
	"en",
	"Locution",
	"NOUN"
>;
const _locutionArticle: "Owned" | "Shared" | "Hidden" | undefined =
	locutionNounOccurrence.articleEvidence?.kind;
declare const locutionVerbOccurrence: Unit<
	"Attestation",
	"de",
	"Locution",
	"VERB"
>;
// @ts-expect-error Only a NOUN Locution owns an article.
locutionVerbOccurrence.articleEvidence;
declare const saying: Surface<"de", "Saying", "Saying">;
// @ts-expect-error A Saying never inflects.
saying.inflectionalFeatures;
declare const foreign: Reading<"de", "Foreign", "Foreign">;
const _sourceLang: string = foreign.lemma.coreFeatures.sourceLang;
// @ts-expect-error A Foreign Reading is its Lemma alone, with no Emoji Description.
foreign.emojiDescription;
// @ts-expect-error Lexeme X is retired; foreign material is Foreign.
type _RetiredX = Lemma<"de", "Lexeme", "X">;
declare const loan: Lemma<"de", "Lexeme", "ADJ">;
// @ts-expect-error No Lexeme route carries UD Foreign; foreign material is Foreign.
loan.coreFeatures.foreign;
declare const adposition: Lemma<"de", "Lexeme", "ADP">;
// German ADP has no Core Features (ADR 0032).
type AdpositionCore = Lemma<"de", "Lexeme", "ADP">["coreFeatures"];
const _adpositionCore: AdpositionCore = adposition.coreFeatures;
// @ts-expect-error Position is no identity; dumspec's ADP Case Table lists it (ADR 0032).
const _adpType: AdpositionCore = { adpType: null };
declare const adpositionOccurrence: Unit<"Attestation", "de", "Lexeme", "ADP">;
// @ts-expect-error The sentence shows an adposition's position; no Attestation records it.
adpositionOccurrence.adpType;
declare const circumposition: Unit<"Attestation", "de", "Locution", "ADP">;
const _circumpositionCase: "Nom" | "Acc" | "Dat" | "Gen" | undefined =
	circumposition.valencyEvidence[0]?.realizedCase;
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
	language: "he",
	family: "Locution",
	kind: "VERB",
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
