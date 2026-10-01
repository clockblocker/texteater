import type { KeptValue } from "./schema-values.js";

/**
 * The German schema values kept although no record reviewed through
 * Attestation uses them, each with the Rule, ADR or open issue keeping it.
 * An entry citing a Rule needs the Rule's statement to name the value.
 */
export const germanKeptValues: readonly KeptValue[] = [
	{
		route: "Lexeme/PART",
		bag: "Core",
		feature: "partType",
		value: "Mod",
		keptBy: { rule: "de/modal-particle-is-part" },
		why: "A modal particle; the authored modal particles carry it.",
	},
	{
		route: "Lexeme/INTJ",
		bag: "Core",
		feature: "partType",
		value: "Res",
		keptBy: { rule: "de/interjection-counts-its-words" },
		why: "A response particle answering a question.",
	},
	{
		route: "Lexeme/ADV",
		bag: "Core",
		feature: "pronType",
		value: "Rel",
		keptBy: { rule: "de/relative-w-adverb-fills-a-slot" },
		why: "A w-adverb naming a place, time, manner or reason inside its own clause.",
	},
];
