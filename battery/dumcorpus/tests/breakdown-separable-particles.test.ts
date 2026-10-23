import { describe, expect, test } from "bun:test";
import { checkBreakdownRecord } from "../src/check-breakdown.js";
import { seedJson } from "./negative-fixtures.js";

const id = "breakdown/de/einkaufen";

const shadow = (family: string, kind: string, canonicalForm: string) => ({
	language: "de",
	canonicalForm,
	family,
	kind,
});

/** The einkaufen seed rebuilt as another particle verb: `first` + `rest`. */
function particleVerb(
	particle: string,
	first: ReturnType<typeof shadow>,
	rest: string,
) {
	const json = seedJson(id);
	json.reading.lemma.canonicalForm = `${particle}${rest}`;
	json.reading.lemma.coreFeatures.hasSepPrefix = particle;
	json.knowledge.breakdown.constituents = [
		{ letters: particle, target: first },
		{ letters: rest, target: shadow("Lexeme", "VERB", rest) },
	];
	return json;
}

/** The Breakdown issues a record's check raises, as `path: message`. */
const breakdownIssues = (json: unknown) => {
	const checked = checkBreakdownRecord(id, json);
	return [...checked.errors, ...checked.issues]
		.filter((issue) => issue.check === "Breakdown")
		.map((issue) => `${issue.path}: ${issue.message}`);
};

describe("a separable verb's first part (ADR 0050)", () => {
	test("links a true particle to its Prefix Morpheme, a compound particle as one piece", () => {
		expect(breakdownIssues(seedJson(id))).toEqual([]);
		expect(
			breakdownIssues(
				particleVerb(
					"hinaus",
					shadow("Morpheme", "Prefix", "hinaus-"),
					"laufen",
				),
			),
		).toEqual([]);
	});

	test("links a noun, adjective or verb first part to its own Lexeme", () => {
		for (const [particle, kind, form] of [
			["teil", "NOUN", "Teil"],
			["fest", "ADJ", "fest"],
			["kennen", "VERB", "kennen"],
		] as const)
			expect(
				breakdownIssues(
					particleVerb(
						particle,
						shadow("Lexeme", kind, form),
						"nehmen",
					),
				),
			).toEqual([]);
	});

	test("fails a true particle linked to a Lexeme", () => {
		expect(
			breakdownIssues(
				particleVerb("ein", shadow("Lexeme", "ADV", "ein"), "kaufen"),
			),
		).toEqual([
			'knowledge.breakdown.constituents.0.target: "ein" is a true separable particle, so it links to the Prefix Morpheme "ein-"',
		]);
	});

	test("fails a compound particle split into its parts", () => {
		const json = particleVerb(
			"hinaus",
			shadow("Morpheme", "Prefix", "hin-"),
			"laufen",
		);
		json.knowledge.breakdown.constituents.splice(1, 0, {
			letters: "aus",
			target: shadow("Morpheme", "Prefix", "aus-"),
		});
		json.knowledge.breakdown.constituents[0].letters = "hin";
		expect(breakdownIssues(json)).toEqual([
			'knowledge.breakdown.constituents.0: A separable verb\'s first part is its particle "hinaus"',
		]);
	});

	test("fails a Lexeme first part linked to a Prefix Morpheme", () => {
		expect(
			breakdownIssues(
				particleVerb(
					"teil",
					shadow("Morpheme", "Prefix", "teil-"),
					"nehmen",
				),
			),
		).toEqual([
			'knowledge.breakdown.constituents.0.target: "teil" is no true separable particle, so it links to its own Lexeme',
		]);
	});
});
