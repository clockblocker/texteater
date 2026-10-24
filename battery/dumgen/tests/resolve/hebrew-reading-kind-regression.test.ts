import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { defaultLunaConfiguration } from "../../src/luna.js";
import { resolveHebrewReading } from "../../src/resolve/he/reading.js";
import type { ResolveReadingInput } from "../../src/resolve/types.js";
import type { JevAsk } from "../../src/segment/jev.js";
import type { Unit } from "../../src/segment/segmented-sentence.js";
import { requestBudget, runOperation } from "./../service-test-adapter.js";

const unit: Unit<"he"> = {
	segments: [5],
	route: { language: "he", family: "Lexeme", kind: "NOUN" },
};
const input: ResolveReadingInput<"he"> = {
	sentence: {
		text: "הֶחָתוּל תָּפַס עַכְבָּר קָטָן.",
		segments: [
			{ kind: "ResolvableText", text: "הֶ" },
			{ kind: "ResolvableText", text: "חָתוּל" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "תָּפַס" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "עַכְבָּר" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "קָטָן" },
			{ kind: "Punctuation", text: "." },
		],
		units: [unit],
	},
	unit,
	attestation: {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "he",
			lemma: {
				unitKind: "Lemma",
				language: "he",
				family: "Lexeme",
				kind: "NOUN",
				canonicalForm: "עכבר",
				coreFeatures: { abbr: null, gender: "Masc" },
			},
			normalizedSurface: "עכבר",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			inflectionalFeatures: { definite: "Ind", number: "Sing" },
		},
		members: [{ attested: "עַכְבָּר", orthography: "Standard" }],
		realizationCoverage: "Full",
		articleEvidence: null,
	},
	candidates: ["🖱"],
	drafted: "🐭",
};

// Native request/prompt contract only; live selection has separate raw evidence.
test("Hebrew Reading distinguishes different kinds without exposing drafts or stored definitions", async () => {
	let calls = 0;
	const jev: JevAsk = async (request) => {
		calls++;
		const question = request.questions.reading;
		expect(question?.instructions).toContain(
			"Clearly different real-world kinds (for example an animal versus a device) are different meanings",
		);
		expect(question?.instructions).toContain(
			"Shared spelling, a related label or visual resemblance is not enough",
		);
		expect(question?.instructions).toContain(
			"Choose NoMatch if every offered emoji depicts the wrong kind",
		);
		expect(question?.instructions).toContain(
			"Reuse a matching sense even if inflection differs",
		);
		expect(Object.keys(request.state).sort()).toEqual([
			"lemma",
			"markedSentence",
		]);
		expect(JSON.stringify(request)).not.toContain("🐭");
		expect(question?.type).toBe("choice");
		if (question?.type !== "choice") throw Error("expected Reading choice");
		expect(question.criteria).toEqual({
			c0: "🖱",
			NoMatch:
				"None of these Emoji Descriptions fits the target's contextual meaning",
		});
		return {
			model: request.model,
			answers: {
				reading: {
					type: "choice",
					choice: "NoMatch",
					confidence: 1,
					probabilities: { NoMatch: 1 },
				},
			},
			usage: { input_tokens: 1, output_tokens: 1 },
		};
	};
	const result = await Effect.runPromise(
		runOperation(
			"resolve.reading",
			{ budget: requestBudget(1), payloads: true },
			{
				jev: { ask: jev, model: "jev-test" },
				luna: {
					configuration: defaultLunaConfiguration,
					ask: async () => {
						throw Error("validated draft requires no Luna call");
					},
				},
			},
			resolveHebrewReading(input),
		),
	);
	expect(result).toEqual({ _tag: "New", emojiDescription: "🐭" });
	expect(calls).toBe(1);
});
