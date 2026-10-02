import { germanPluralPattern, normalizeText } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { DumgenFailure } from "../../../universal/failure.js";

export const pluralPrompt =
	'Name the plural of the fixed exact German NOUN Reading in its marked context. The Reading\'s emojiDescription is the sense anchor: a homonym\'s other sense may form its plural differently (Mutter 👩: Mütter; Mutter 🔩: Muttern; Bank 🪑: Bänke; Bank 🏦: Banken). Return {plurality:"HasPlural",plurals:[...]} with every standard nominative plural this sense takes, most common first, each one word without an article (Pizza: Pizzen, Pizzas). Return {plurality:"NoPlural",plurals:[]} for a noun this sense never uses in the plural (Milch, Obst) and {plurality:"PluralOnly",plurals:[]} for a noun that has no singular (Leute, Ferien). Never return a dative plural (Kindern), a diminutive or a compound.';

export const pluralOutputSchema = {
	type: "object",
	properties: {
		plurality: {
			type: "string",
			enum: ["HasPlural", "NoPlural", "PluralOnly"],
		},
		plurals: { type: "array", items: { type: "string" }, maxItems: 3 },
	},
	required: ["plurality", "plurals"],
	additionalProperties: false,
} as const;

/**
 * The noun's plural from the model's answer: code derives each plural form's
 * Plural Pattern from the Canonical Form (#597). A HasPlural answer needs one
 * to three one-word forms, and a marker none; anything else is invalid output.
 */
export function parsePlural(
	output: unknown,
	canonicalForm: string,
	route: string,
): Dumrel.NounPlural {
	const invalid = (message: string) =>
		new DumgenFailure(
			"InvalidModelOutput",
			"produceKnowledge",
			message,
			route,
		);
	if (
		!output ||
		typeof output !== "object" ||
		Object.keys(output).length !== 2 ||
		!("plurality" in output) ||
		!("plurals" in output) ||
		!Array.isArray(output.plurals)
	)
		throw invalid("Expected only plurality and plurals");
	const { plurality, plurals } = output as {
		plurality: unknown;
		plurals: unknown[];
	};
	if (plurality === "NoPlural" || plurality === "PluralOnly") {
		if (plurals.length) throw invalid(`${plurality} names no plural`);
		return plurality;
	}
	if (plurality !== "HasPlural") throw invalid("Unknown plurality");
	const forms = plurals.map((plural) =>
		typeof plural === "string" ? normalizeText(plural) : "",
	);
	if (
		!forms.length ||
		forms.length > 3 ||
		forms.some((form) => !/^\S+$/u.test(form))
	)
		throw invalid("Expected one to three one-word plurals");
	return [
		...new Set(
			forms.map((form) => germanPluralPattern(canonicalForm, form)),
		),
	] as Dumrel.NounPlural;
}

/**
 * What one run contributes: the proposed plural with the pattern this
 * sentence attests added. The attestation outweighs a proposed NoPlural, and
 * a PluralOnly noun attests only its own Canonical Form, so it adds nothing.
 */
export function mergedPlural(
	proposed: Dumrel.NounPlural | null,
	attested: Dumrel.PluralPattern | undefined,
): Dumrel.NounPlural | null {
	if (!attested || proposed === "PluralOnly") return proposed;
	if (!proposed || proposed === "NoPlural") return [attested];
	return proposed.includes(attested) ? proposed : [...proposed, attested];
}
