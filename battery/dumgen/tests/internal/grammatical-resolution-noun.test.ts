import { describe, expect, test } from "bun:test";

import { assembleSystemPrompt } from "../../src/promptsmith/assembly";
import {
	acceptanceEvaluation,
	developmentEvaluation,
	nounGrammaticalResolutionAcceptanceExperiment,
	nounGrammaticalResolutionExperiment,
} from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-noun/evaluation-suite";
import { evaluateNounGrammaticalResolution } from "../../src/promptsmith/laboratory/experiments/grammatical-resolution-noun/evaluator";
import { corpus } from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/noun/golden-corpus/corpus";
import {
	demonstrations,
	promptSource,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/noun/prompt-source";
import {
	outputSchema,
	projectNounNormalizedSurface,
} from "../../src/promptsmith/production/grammatical-resolution/de/lexeme/noun/schemas";

const expectedDevelopmentIds = [
	"grammar-de-noun-dev-nom-plur-banken",
	"grammar-de-noun-dev-dat-sing-bibliothek",
	"grammar-de-noun-dev-gen-sing-mannes",
	"grammar-de-noun-dev-gen-plur-frauen",
	"grammar-de-noun-dev-vocative-leute",
	"grammar-de-noun-dev-acc-plur-buecher",
	"grammar-de-noun-dev-nom-sing-maedchen",
	"grammar-de-noun-dev-acc-sing-stadt",
	"grammar-de-noun-dev-dat-sing-chef",
	"grammar-de-noun-dev-nom-plur-eltern",
	"grammar-de-noun-dev-acc-plur-knie",
	"grammar-de-noun-dev-hyphenated-u-bahn",
	"grammar-de-noun-dev-variant-photographie",
	"grammar-de-noun-dev-lowercase-katze",
	"grammar-de-noun-dev-archaic-odem",
	"grammar-de-noun-dev-compound-haustuer",
	"grammar-de-noun-dev-substantivized-reisenden",
	"grammar-de-noun-dev-gen-sing-schule",
	"grammar-de-noun-dev-suspended-right-jugendbuecher",
	"grammar-de-noun-dev-suspended-hyphen-genitiv",
	"grammar-de-noun-dev-suspended-typo",
] as const;

const expectedAcceptanceIds = [
	"grammar-de-noun-accept-nom-sing-mark",
	"grammar-de-noun-accept-nom-sing-tisch",
	"grammar-de-noun-accept-acc-sing-tuer",
	"grammar-de-noun-accept-dat-plur-haeusern",
	"grammar-de-noun-accept-gen-plur-kinder",
	"grammar-de-noun-accept-invariant-plur-maedchen",
	"grammar-de-noun-accept-plural-only-ferien",
	"grammar-de-noun-accept-hyphenated-e-mail",
	"grammar-de-noun-accept-substantivized-angestellten",
	"grammar-de-noun-accept-suspended-nonbreaking",
	"grammar-de-noun-accept-suspended-oder-singular",
	"grammar-de-noun-accept-suspended-dativ-plural",
	"grammar-de-noun-accept-suspended-nominativ-plural",
] as const;

describe("Lexeme/NOUN reference corpus", () => {
	test("pins 40 total flat cases in three pairwise-disjoint partitions", () => {
		expect(corpus.all().ids).toHaveLength(40);
		expect(demonstrations.ids).toEqual([
			"grammar-de-noun-demo-citation-haus",
			"grammar-de-noun-demo-acc-sing-hund",
			"grammar-de-noun-demo-dat-plur-kindern",
			"grammar-de-noun-demo-typo-kaffe",
			"grammar-de-noun-demo-archaic-antlitz",
			"grammar-de-noun-demo-suspended-kinderbuecher",
		]);
		expect(developmentEvaluation.ids).toEqual(expectedDevelopmentIds);
		expect(acceptanceEvaluation.ids).toEqual(expectedAcceptanceIds);
		expect(demonstrations.isDisjointFrom(developmentEvaluation)).toBe(true);
		expect(demonstrations.isDisjointFrom(acceptanceEvaluation)).toBe(true);
		expect(developmentEvaluation.isDisjointFrom(acceptanceEvaluation)).toBe(
			true,
		);
		expect(
			demonstrations
				.union(developmentEvaluation)
				.union(acceptanceEvaluation).ids,
		).toHaveLength(40);
		expect(nounGrammaticalResolutionExperiment.evaluation).toBe(
			developmentEvaluation,
		);
		expect(nounGrammaticalResolutionAcceptanceExperiment.evaluation).toBe(
			acceptanceEvaluation,
		);

		for (const goldenCase of Object.values(corpus.cases)) {
			expect(Object.keys(goldenCase.input).sort()).toEqual([
				"markedContext",
				"members",
			]);
			expect(Object.keys(goldenCase.idealOutput).sort()).toEqual([
				"lemma",
				"memberOrthographies",
				"normalizedMembers",
				"surface",
			]);
			expect(goldenCase.idealOutput).not.toHaveProperty("decision");
			expect(goldenCase.idealOutput).not.toHaveProperty("resolution");
			expect(goldenCase.idealOutput).not.toHaveProperty(
				"realizationCoverage",
			);
		}
	});

	test("assembles the fixed upstream contract and only six demonstrations", () => {
		const prompt = assembleSystemPrompt(promptSource);
		expect(prompt).toContain("already-classified German Lexeme/NOUN");
		expect(prompt).toContain("Always return a Surface and Lemma");
		expect(prompt).toContain("Kinder- becomes Kinderbücher");
		expect(prompt).toContain("Return exactly one object");
		expect(prompt).toContain("Kaffe");
		expect(prompt).toContain("Antlitz");
		expect(prompt).toContain("Kinder-</TARGET> und Jugendbücher");
		expect(prompt).not.toContain("Bibliothek");
		expect(prompt).not.toContain("<TARGET>Mark</TARGET>");
	});
});

describe("Lexeme/NOUN diagnostic evaluator", () => {
	test("passes every development and untouched acceptance oracle exactly", () => {
		for (const selection of [developmentEvaluation, acceptanceEvaluation]) {
			for (const [index, caseId] of selection.ids.entries()) {
				const goldenCase = selection.cases[index];
				if (goldenCase === undefined)
					throw new Error(`Missing ${caseId}.`);
				const result = evaluateNounGrammaticalResolution({
					caseId,
					input: goldenCase.input,
					idealOutput: goldenCase.idealOutput,
					output: goldenCase.idealOutput,
				});
				expect(Object.values(result).every(Boolean)).toBe(true);
			}
		}
	});

	test("reports a flat field miss and rejects legacy wrappers", () => {
		const goldenCase = corpus.cases["grammar-de-noun-demo-typo-kaffe"];
		if (goldenCase === undefined) throw new Error("Missing Kaffee case.");
		const output = {
			...goldenCase.idealOutput,
			normalizedMembers: ["Kaffe"],
		};
		const result = evaluateNounGrammaticalResolution({
			caseId: "grammar-de-noun-demo-typo-kaffe",
			input: goldenCase.input,
			idealOutput: goldenCase.idealOutput,
			output,
		});

		expect(result.contractPass).toBe(false);
		expect(result.normalizedSurfacePass).toBe(false);
		expect(result.memberOrthographiesPass).toBe(true);
		expect(
			outputSchema.safeParse({
				decision: "Resolved",
				resolution: goldenCase.idealOutput,
			}).success,
		).toBe(false);
	});
});

describe("Lexeme/NOUN suspended-compound projection", () => {
	test("admits only the narrow #93 completion rule", () => {
		for (const caseId of [
			"grammar-de-noun-demo-suspended-kinderbuecher",
			"grammar-de-noun-dev-suspended-hyphen-genitiv",
			"grammar-de-noun-dev-suspended-typo",
			"grammar-de-noun-accept-suspended-nonbreaking",
			"grammar-de-noun-accept-suspended-oder-singular",
			"grammar-de-noun-accept-suspended-dativ-plural",
			"grammar-de-noun-accept-suspended-nominativ-plural",
		] as const) {
			const goldenCase = corpus.cases[caseId];
			if (goldenCase === undefined) throw new Error(`Missing ${caseId}.`);
			const projected = projectNounNormalizedSurface({
				input: goldenCase.input,
				memberOrthographies: goldenCase.idealOutput.memberOrthographies,
				normalizedMembers: goldenCase.idealOutput.normalizedMembers,
				lemma: goldenCase.idealOutput.lemma,
				surface: goldenCase.idealOutput.surface,
			});
			const expected = goldenCase.idealOutput.normalizedMembers[0];
			if (expected === undefined) throw new Error(`Empty ${caseId}.`);
			expect(projected).toBe(expected);
		}

		expect(
			projectNounNormalizedSurface({
				input: {
					markedContext:
						"Sie verkauft <TARGET>Jugendbücher</TARGET>.",
					members: ["Jugendbücher"],
				},
				memberOrthographies: ["Standard"],
				normalizedMembers: ["Jugendbücher"],
				lemma: {},
				surface: { surfaceKind: "Inflection" },
			}),
		).toBe("Jugendbücher");

		for (const invalid of [
			{
				markedContext: "Sie verkauft <TARGET>Kinder-</TARGET>.",
				normalized: "Kinderbücher",
			},
			{
				markedContext: "<TARGET>Kinder-</TARGET> Überraschung",
				normalized: "Kinderbücher",
			},
			{
				markedContext:
					"<TARGET>Kinder-</TARGET> und gestern kamen alle.",
				normalized: "Kinderbücher",
			},
			{
				markedContext:
					"Sie verkauft <TARGET>Kinder-</TARGET> und Bücher.",
				normalized: "Kinderbücher",
			},
			{
				markedContext:
					"Sie verkauft <TARGET>Kinder-</TARGET> und Jugendbücher und Sachbücher.",
				normalized: "Kinderbücher",
			},
			{
				markedContext:
					"Sie verkauft <TARGET>Kinder-</TARGET> und Jugendbücher.",
				normalized: "Kinderhefte",
			},
			{
				markedContext:
					"Sie verkauft <TARGET>Kinder-</TARGET> und Jugendliche.",
				normalized: "Kinderbücher",
			},
			{
				markedContext:
					"Sie verkauft <TARGET>Kinder-</TARGET> und Jugend Bücher.",
				normalized: "Kinderbücher",
			},
			{
				markedContext:
					"Sie verkauft <TARGET>Kinder-</TARGET> und Jugendbücher.",
				normalized: "Kinder",
			},
			{
				markedContext:
					"Sie verkauft <TARGET>Kinder-</TARGET> und Jugendbücher.",
				normalized: "Kinderbuch",
			},
		] as const) {
			expect(() =>
				projectNounNormalizedSurface({
					input: {
						markedContext: invalid.markedContext,
						members: ["Kinder-"],
					},
					memberOrthographies: ["Standard"],
					normalizedMembers: [invalid.normalized],
					lemma: {},
					surface: { surfaceKind: "Inflection" },
				}),
			).toThrow(/suspended completion/);
		}

		expect(() =>
			projectNounNormalizedSurface({
				input: {
					markedContext: "<TARGET>Mutter-</TARGET> und Kind",
					members: ["Mutter-"],
				},
				memberOrthographies: ["Standard"],
				normalizedMembers: ["Mutterkind"],
				lemma: {},
				surface: { surfaceKind: "Inflection" },
			}),
		).toThrow(/suspended completion/);

		expect(() =>
			projectNounNormalizedSurface({
				input: {
					markedContext: "<TARGET>Kinder-</TARGET> und Jugendbücher",
					members: ["Kinder-"],
				},
				memberOrthographies: ["Standard", "Standard"],
				normalizedMembers: ["Kinderbücher", "Jugendbücher"],
				lemma: {},
				surface: { surfaceKind: "Inflection" },
			}),
		).toThrow(/suspended completion/);

		expect(() =>
			projectNounNormalizedSurface({
				input: {
					markedContext: "<TARGET>Kinder‒</TARGET> und Jugendbücher",
					members: ["Kinder‒"],
				},
				memberOrthographies: ["Standard"],
				normalizedMembers: ["Kinderbücher"],
				lemma: {},
				surface: { surfaceKind: "Inflection" },
			}),
		).toThrow(/positional normalization/);

		expect(() =>
			projectNounNormalizedSurface({
				input: {
					markedContext: "<TARGET>Kinder-</TARGET> und Jugendbücher",
					members: ["Kinder-"],
				},
				memberOrthographies: ["Standard"],
				normalizedMembers: ["Kinderbücher"],
				lemma: {},
				surface: { surfaceKind: "Citation" },
			}),
		).toThrow(/suspended completion/);

		for (const invalid of [
			{
				markedContext:
					"Kinder-, <TARGET>Jugend-</TARGET> und Sachbücher",
				member: "Jugend-",
				normalized: "Jugendbücher",
			},
			{
				markedContext:
					"<TARGET>Kinder-</TARGET> und Jugendbücher, und Sachbücher",
				member: "Kinder-",
				normalized: "Kinderbücher",
			},
			{
				markedContext:
					"Kinder- sowie <TARGET>Jugend-</TARGET> und Sachbücher",
				member: "Jugend-",
				normalized: "Jugendbücher",
			},
			{
				markedContext:
					"<TARGET>Kinder-</TARGET> und Jugendbücher sowie Sachbücher",
				member: "Kinder-",
				normalized: "Kinderbücher",
			},
		]) {
			expect(() =>
				projectNounNormalizedSurface({
					input: {
						markedContext: invalid.markedContext,
						members: [invalid.member],
					},
					memberOrthographies: ["Standard"],
					normalizedMembers: [invalid.normalized],
					lemma: {},
					surface: { surfaceKind: "Inflection" },
				}),
			).toThrow(/suspended completion/);
		}
	});

	test("derives the shared suffix after Unicode normalization", () => {
		const input = {
			markedContext: "<TARGET>Ku\u0308nstler-</TARGET> und Sachbücher",
			members: ["Ku\u0308nstler-"],
		};

		expect(
			projectNounNormalizedSurface({
				input,
				memberOrthographies: ["Standard"],
				normalizedMembers: ["Künstlerbücher"],
				lemma: {},
				surface: { surfaceKind: "Inflection" },
			}),
		).toBe("Künstlerbücher");

		expect(() =>
			projectNounNormalizedSurface({
				input,
				memberOrthographies: ["Standard"],
				normalizedMembers: ["KünstlerXbücher"],
				lemma: {},
				surface: { surfaceKind: "Inflection" },
			}),
		).toThrow(/suspended completion/);
	});
});
