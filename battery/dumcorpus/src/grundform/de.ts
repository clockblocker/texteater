import type * as Dumling from "dumling/types";
import {
	adverb,
	adjective as comparabilityAdjective,
} from "./comparability.js";
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
		expletive: [null],
		perfect: [null],
		future: [null],
		passive: [null],
	},
};
const adjective = comparabilityAdjective(["case", "gender", "number"]);
function noun(surface: Dumling.Surface): GrundformRule {
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
/**
 * A pillar PRON or DET is one Paradigm Cell: Core case, number or gender
 * name the Lemma, so its spelling alone decides. A stem Lemma cites its
 * Nom.Masc.Sg Surface, or its Nom.Plur Surface when it is cited in the plural
 * (einige, beide); no German declension spells those two cells alike, so the
 * Canonical Form check already tells them apart. A Surface without a bag is
 * an uninflected realization (viel Geld, derlei) and its spelling decides.
 */
function germanClosedClass(surface: Dumling.Surface): GrundformRule {
	const core: Readonly<Record<string, unknown>> = surface.lemma.coreFeatures;
	if (
		["case", "number", "gender"].some(
			(coordinate) => (core[coordinate] ?? null) !== null,
		) ||
		inflectionalFeatures(surface) === null
	)
		return { features: {} };
	return {
		features: {
			case: ["Nom"],
			number: ["Sing", "Plur"],
			gender: ["Masc", null],
		},
	};
}

/**
 * A Locution route borrows the rule of the Lexeme route with its Kind (ADR
 * 0039): `den Faden verlieren` cites its infinitive, `weißer Rabe` its
 * nominative singular, `fix und fertig` its undeclined positive, and a
 * non-comparable ADV Locution (`zum Teil`) its spelling. An invariant Locution
 * or a Saying has no bag, so its spelling decides.
 */
export const germanRules = {
	"de/Lexeme/ADJ": adjective,
	"de/Lexeme/ADV": adverb,
	"de/Lexeme/AUX": infinitive,
	"de/Lexeme/DET": germanClosedClass,
	"de/Lexeme/NOUN": noun,
	"de/Lexeme/NUM": lexicalConvention,
	"de/Lexeme/PRON": germanClosedClass,
	"de/Lexeme/PROPN": noun,
	"de/Lexeme/SYM": lexicalConvention,
	"de/Lexeme/VERB": infinitive,
	"de/Locution/ADJ": adjective,
	"de/Locution/ADV": adverb,
	"de/Locution/DET": germanClosedClass,
	"de/Locution/NOUN": noun,
	"de/Locution/NUM": lexicalConvention,
	"de/Locution/PRON": germanClosedClass,
	"de/Locution/VERB": infinitive,
} as const;
