import type { Surface } from "../types.js";
import {
	type FeatureRequirements,
	type GrundformRule,
	inflectionalFeatures,
} from "./features.js";
import { lemmaRule, lexicalConvention } from "./lemma-rule.js";

const infinitive: GrundformRule = {
	features: {
		verbForm: ["Inf"],
		mood: [null],
		person: [null],
		tense: [null],
		number: [null],
		voice: [null, "Act"],
	},
};
const adjective: GrundformRule = {
	features: { degree: ["Pos"], case: [null], gender: [null], number: [null] },
};
function noun(surface: Surface): GrundformRule {
	const features: FeatureRequirements = { case: ["Nom"] };
	if (inflectionalFeatures(surface)?.number === "Plur")
		return {
			...lemmaRule(
				"Plural evidence does not establish whether this Lemma has a plural-only canonical form",
			),
			features,
		};
	return { features: { ...features, number: ["Sing"] } };
}
// ADR 0018: reviewed German personal case forms are separate Lemmas. Case
// therefore belongs to each canonical form, not to one PRON-wide Nom default.
const germanPersonalCases: Readonly<Record<string, readonly string[]>> = {
	ich: ["Nom"],
	mich: ["Acc"],
	mir: ["Dat"],
	meiner: ["Gen"],
	du: ["Nom"],
	dich: ["Acc"],
	dir: ["Dat"],
	deiner: ["Gen"],
	er: ["Nom"],
	ihn: ["Acc"],
	ihm: ["Dat"],
	seiner: ["Gen"],
	sie: ["Nom", "Acc"],
	ihr: ["Nom", "Dat"],
	ihrer: ["Gen"],
	es: ["Nom", "Acc"],
	wir: ["Nom"],
	uns: ["Acc", "Dat"],
	unser: ["Gen"],
	euch: ["Acc", "Dat"],
	euer: ["Gen"],
	ihnen: ["Dat"],
	Sie: ["Nom", "Acc"],
	Ihnen: ["Dat"],
	Ihrer: ["Gen"],
	sich: ["Acc", "Dat"],
};
function germanPronoun(surface: Surface): GrundformRule {
	const core = surface.lemma.coreFeatures;
	if (!("pronType" in core) || core.pronType !== "Prs")
		return lexicalConvention;
	const form = surface.lemma.canonicalForm;
	const cases = Object.hasOwn(germanPersonalCases, form)
		? germanPersonalCases[form]
		: undefined;
	return cases ? { features: { case: cases } } : lexicalConvention;
}

export const germanRules = {
	"de/Lexeme/ADJ": adjective,
	"de/Lexeme/ADV": { features: { degree: ["Pos"] } },
	"de/Lexeme/AUX": infinitive,
	"de/Lexeme/DET": lexicalConvention,
	"de/Lexeme/NOUN": noun,
	"de/Lexeme/NUM": lexicalConvention,
	"de/Lexeme/X": lexicalConvention,
	"de/Lexeme/PRON": germanPronoun,
	"de/Lexeme/PROPN": noun,
	"de/Lexeme/SYM": lexicalConvention,
	"de/Lexeme/VERB": infinitive,
	"de/Phraseme/Collocation": infinitive,
	"de/Phraseme/Idiom": infinitive,
} as const;
