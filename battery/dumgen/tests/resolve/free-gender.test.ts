import { describe, expect, test } from "bun:test";
import { canonicalJson } from "common-utils";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import {
	type GrammarCase,
	grammarCases,
} from "../../lab/evaluation/resolve-grammar/cases.js";
import {
	goldAnswers,
	goldWritten,
} from "../../lab/evaluation/resolve-grammar/oracle.js";
import { evaluateGrammar } from "../../lab/evaluation/resolve-grammar/scoring.js";
import { createDumgen } from "../../src/create-dumgen.js";

type NounGender = Dumling.Lemma<
	"de",
	"Lexeme",
	"NOUN"
>["coreFeatures"]["gender"];

/** Resolves a case with gold's answers, and the question ids jev was asked. */
async function underGold(goldCase: GrammarCase) {
	const asked: string[] = [];
	const dumgen = createDumgen({
		jev: async (request) => {
			asked.push(...Object.keys(request.questions));
			return {
				model: request.model,
				answers: goldAnswers(goldCase, request.questions),
				usage: { input_tokens: 0, output_tokens: 0 },
			};
		},
		luna: async (request) => ({
			output: goldWritten(goldCase, request.input),
		}),
	});
	const result = await Effect.runPromise(
		dumgen.resolve.grammar({
			language: "de",
			sentence: goldCase.sentence,
			unit: goldCase.unit,
			neighbours: {},
			lemmaCandidates: [],
		}),
	);
	return { result, asked };
}

/**
 * A two-word NOUN case, «<article> Balg <verb>.», whose gold Lemma has
 * `gender`, singular nominative.
 */
function balgCase(article: string, verb: string, gender: NounGender) {
	const words = [article, "Balg", verb];
	const segments = [
		...words.flatMap((text, index) => [
			...(index ? [{ kind: "Whitespace" as const, text: " " }] : []),
			{ kind: "ResolvableText" as const, text },
		]),
		{ kind: "Punctuation" as const, text: "." },
	];
	const route = { language: "de", family: "Lexeme", kind: "NOUN" } as const;
	const ideal: Dumling.Attestation<"de", "Lexeme", "NOUN"> = {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "de",
			lemma: {
				unitKind: "Lemma",
				language: "de",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "Balg",
				coreFeatures: { gender },
			},
			normalizedSurface: "Balg",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			inflectionalFeatures: { case: "Nom", gender: null, number: "Sing" },
		},
		members: [
			{ attested: article, orthography: "Standard" },
			{ attested: "Balg", orthography: "Standard" },
		],
		realizationCoverage: "Full",
		articleEvidence: { kind: "Owned", member: 0 },
		valencyEvidence: [],
	};
	return {
		id: `balg/${article}`,
		record: "balg",
		target: 0,
		sentence: {
			text: `${words.join(" ")}.`,
			segments,
			units: [{ segments: [0, 2], route }],
		},
		unit: { segments: [0, 2], route },
		ideal,
		rules: ["de/noun-gender-in-free-variation"],
	} satisfies GrammarCase;
}

describe("a noun in free gender variation (Rule de/noun-gender-in-free-variation)", () => {
	test("Cola resolves to its mixed gender under gold's answers, with no sense question", async () => {
		const { dev, heldout } = grammarCases();
		const cola = [...dev, ...heldout].find(
			({ id }) => id === "de/der-kellner-bringt-eine-cola#1",
		);
		if (!cola) throw Error("The Cola case is gone from the records");
		expect(cola.ideal.surface.lemma.coreFeatures).toEqual({
			gender: { mixed: ["Fem", "Neut"] },
		});
		const { result, asked } = await underGold(cola);
		if (result._tag !== "Resolved") throw Error(result._tag);
		expect(canonicalJson(result.attestation)).toBe(
			canonicalJson(cola.ideal),
		);
		expect(asked).not.toContain("freeGender");
	});

	test("Balg in the child sense resolves to der oder das, whichever article it shows", async () => {
		for (const article of ["Das", "Der"]) {
			const child = balgCase(article, "schreit", {
				mixed: ["Masc", "Neut"],
			});
			const { result, asked } = await underGold(child);
			if (result._tag !== "Resolved") throw Error(result._tag);
			expect(canonicalJson(result.attestation)).toBe(
				canonicalJson(child.ideal),
			);
			expect(asked).toContain("freeGender");
		}
	});

	test("der Balg, the skin, keeps its one gender: jev says it is the other sense", async () => {
		const skin = balgCase("Der", "glänzt", "Masc");
		const { result, asked } = await underGold(skin);
		if (result._tag !== "Resolved") throw Error(result._tag);
		expect(result.attestation.surface.lemma.coreFeatures).toEqual({
			gender: "Masc",
		});
		expect(canonicalJson(result.attestation)).toBe(
			canonicalJson(skin.ideal),
		);
		expect(asked).toContain("freeGender");
	});

	test("the scorer's cell compares a mixed gender as written", () => {
		const child = balgCase("Das", "schreit", { mixed: ["Masc", "Neut"] });
		const withGender = (gender: NounGender) => ({
			...child.ideal,
			surface: {
				...child.ideal.surface,
				lemma: {
					...child.ideal.surface.lemma,
					coreFeatures: { gender },
				},
			},
		});
		const cell = (gender: NounGender) =>
			evaluateGrammar(child.ideal, {
				_tag: "Resolved",
				attestation: withGender(gender),
			}).cell;
		expect(cell({ mixed: ["Masc", "Neut"] })).toBe(true);
		expect(cell("Masc")).toBe(false);
		expect(cell("Neut")).toBe(false);
	});
});
