import type { z } from "zod";
import type { SourceRoute } from "../codegen/routes.js";

interface Shape {
	anyOf?: Shape[];
	const?: unknown;
	enum?: unknown[];
	items?: Shape;
	properties?: Record<string, Shape>;
	type?: string;
}
function example(shape: Shape): unknown {
	if (shape.anyOf)
		return example(
			shape.anyOf.find((option) => option.type !== "null") ??
				shape.anyOf[0] ??
				{},
		);
	if ("const" in shape) return shape.const;
	if (shape.enum) return shape.enum[0];
	if (shape.type === "object")
		return Object.fromEntries(
			Object.entries(shape.properties ?? {}).map(([key, value]) => [
				key,
				example(value),
			]),
		);
	if (shape.type === "array") return [example(shape.items ?? {})];
	if (shape.type === "null") return null;
	if (shape.type === "boolean") return true;
	if (shape.type === "number" || shape.type === "integer") return 1;
	return "example";
}
export function unitFixtures(route: SourceRoute, zod: typeof z) {
	const sample = example(zod.toJSONSchema(route.bag) as Shape) as {
		core: Record<string, unknown>;
	};
	if (route.key === "de/Lexeme/PRON")
		sample.core = Object.fromEntries(
			Object.keys(sample.core).map((key) => [key, null]),
		);
	// A Foreign unit's source language is an ISO 639 code (ADR 0045).
	if (route.family === "Foreign") sample.core.sourceLang = "en";
	// The first German number value is plural, whose agreement has no gender.
	if (route.key === "de/Lexeme/DET") sample.core.gender = null;
	// A German PART names exactly one type (partType Inf here).
	if (route.key === "de/Lexeme/PART") sample.core.polarity = null;
	const bag = route.bag.parse(sample);
	// A DET or PRON Locution's first number value is plural too.
	if (
		["de/Locution/DET", "de/Locution/PRON"].includes(route.key) &&
		bag.inflectional
	)
		Object.assign(bag.inflectional, { gender: null });
	// A Paradigm Cell coordinate is marked in Core or on the Surface, never both.
	if (
		(route.key === "de/Lexeme/DET" || route.key === "de/Lexeme/PRON") &&
		bag.inflectional
	)
		Object.assign(bag.inflectional, {
			case: null,
			gender: null,
			number: null,
		});
	// The PRON sample Core is unmarked, so it is no possessive.
	if (route.key === "de/Lexeme/PRON" && bag.inflectional)
		Object.assign(bag.inflectional, {
			"gender[psor]": null,
			"number[psor]": null,
		});
	// Only a singular whose Lemma has no gender marks gender on the Surface.
	if (
		(route.key === "de/Lexeme/NOUN" || route.key === "de/Lexeme/PROPN") &&
		bag.inflectional
	)
		Object.assign(bag.inflectional, { gender: null });
	const verbal = [
		"de/Lexeme/VERB",
		"de/Lexeme/AUX",
		"de/Locution/VERB",
	].includes(route.key);
	if (verbal && bag.inflectional)
		Object.assign(bag.inflectional, { expletive: null });
	const Lemma = {
		unitKind: "Lemma",
		language: route.language,
		family: route.family,
		kind: route.kind,
		canonicalForm: "example",
		coreFeatures: bag.core,
	};
	const Surface = {
		unitKind: "Surface",
		language: route.language,
		lemma: Lemma,
		normalizedSurface: "example",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,

		...(Object.hasOwn(bag, "inflectional")
			? { inflectionalFeatures: bag.inflectional }
			: {}),
	};
	// A Foreign Reading is its Lemma alone (ADR 0045).
	const Reading = {
		unitKind: "Reading",
		lemma: Lemma,
		...(route.family === "Foreign" ? {} : { emojiDescription: "🏠" }),
	};
	const Attestation = {
		unitKind: "Attestation",
		...(verbal ? { expletiveEvidence: null, valencyEvidence: [] } : {}),
		...(route.key === "de/Lexeme/ADP" || route.key === "de/Locution/ADP"
			? { valencyEvidence: [] }
			: {}),
		surface: Surface,
		members: [{ attested: "example", orthography: "Standard" }],
		realizationCoverage: "Full",
		...([
			...["de", "en"].flatMap((language) =>
				["NOUN", "PROPN", "ADJ", "NUM", "PRON"].map(
					(kind) => `${language}/Lexeme/${kind}`,
				),
			),
			"he/Lexeme/NOUN",
			"he/Lexeme/PROPN",
			"he/Lexeme/ADJ",
		].includes(route.key)
			? { articleEvidence: null }
			: {}),
		...([
			"de/Lexeme/ADJ",
			"de/Lexeme/NOUN",
			"de/Locution/ADJ",
			"de/Locution/NOUN",
		].includes(route.key)
			? { valencyEvidence: [] }
			: {}),
	};
	return { Lemma, Surface, Reading, Attestation };
}
