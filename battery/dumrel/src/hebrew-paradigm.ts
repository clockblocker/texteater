import { normalizeForm, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import type { ReadingKnowledge } from "./types.js";

/** Keys required by each existing Hebrew Dumling inflection bag. Values still go through Dumling. */
const inflectionKeys: Readonly<Record<string, readonly string[]>> = {
	NOUN: ["definite", "number"],
	PROPN: ["number"],
	ADJ: ["definite", "gender", "number"],
	AUX: ["gender", "number", "person", "polarity", "tense", "verbForm"],
	DET: ["definite", "gender", "number"],
	NUM: ["definite", "gender", "number"],
	PRON: ["gender", "number", "person"],
	VERB: [
		"definite",
		"gender",
		"mood",
		"number",
		"person",
		"polarity",
		"tense",
		"verbForm",
		"voice",
	],
};

/** Shape validation is generated; source and cell compatibility remain Hebrew-owned. */
export function hebrewParadigmIssue(
	source: Dumling.Reading,
	paradigm: NonNullable<ReadingKnowledge["hebrewParadigm"]>,
): string | undefined {
	const { lemma } = source;
	const keys = inflectionKeys[lemma.kind];
	if (lemma.language !== "he" || lemma.family !== "Lexeme" || !keys)
		return "Only an inflecting Hebrew Lexeme Reading has a Hebrew paradigm";
	const seen = new Set<string>();
	for (const { form, features } of paradigm.forms) {
		if (!normalizeForm(form))
			return "A Hebrew paradigm form must contain text";
		if (Object.keys(features).length === 0)
			return "A paradigm form needs known inflection features";
		if (Object.keys(features).some((key) => !keys.includes(key)))
			return `A ${lemma.kind} paradigm cannot carry these inflection features`;
		const signature = JSON.stringify([
			normalizeForm(form),
			Object.entries(features).sort(([a], [b]) => a.localeCompare(b)),
		]);
		if (seen.has(signature))
			return "A Hebrew paradigm lists each form and feature cell once";
		seen.add(signature);
		if (
			(lemma.kind === "VERB" || lemma.kind === "AUX") &&
			features.definite &&
			features.verbForm !== "Part"
		)
			return "Only a participle can carry verbal definiteness";
		if (
			features.verbForm === "Inf" &&
			(features.person ||
				features.gender ||
				features.number ||
				features.tense ||
				features.mood ||
				features.definite)
		)
			return "An infinitive cannot claim finite or agreeing inflection features";
		if (
			features.verbForm === "Part" &&
			(features.person || features.tense || features.mood)
		)
			return "A participle does not claim a finite person, tense or mood";
		if (
			features.mood === "Imp" &&
			(features.tense ||
				features.verbForm ||
				(features.person && features.person !== "2"))
		)
			return "An imperative cannot claim a tense, nonfinite form or non-second person";
		const bag = Object.fromEntries(
			keys.map((key) => [key, Reflect.get(features, key) ?? null]),
		);
		const parsed = parseUnit({
			unitKind: "Surface",
			language: "he",
			lemma,
			normalizedSurface: form,
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			inflectionalFeatures: bag,
		});
		if (!parsed.success)
			return `Invalid Hebrew paradigm cell: ${parsed.error.message}`;
	}
	return undefined;
}
