import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { requestBudget, runOperation } from "../../../src/call.js";
import { accumulateHebrewTranslations } from "../../../src/knowledge/he/accumulate.js";
import type { AccumulateTranslationsInput } from "../../../src/knowledge/types.js";
import { defaultLunaConfiguration } from "../../../src/luna.js";
import { pinnedJevModel } from "../../../src/segment/jev.js";
import { knowledgeJev, knowledgeLuna, knowledgeLunaInput } from "../support.js";

const lemma = {
	unitKind: "Lemma",
	language: "he",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "ספר",
	coreFeatures: { gender: "Masc", abbr: null },
} as const;
const reading = { unitKind: "Reading", lemma, emojiDescription: "📚" } as const;
const attestation = {
	unitKind: "Attestation",
	surface: {
		unitKind: "Surface",
		language: "he",
		lemma,
		normalizedSurface: "ספר",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: { number: "Sing", definite: "Ind" },
	},
	members: [{ attested: "ספר", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
	valencyEvidence: [],
} as const satisfies Dumling.Attestation<"he">;
const input = (
	translations: AccumulateTranslationsInput<"he">["translations"],
): AccumulateTranslationsInput<"he"> => ({
	language: "he",
	reading,
	attestation,
	sentence: {
		segments: [{ text: "קראתי " }, { text: "ספר" }, { text: "." }],
		target: [1],
	},
	translations,
});
const run = (
	jev: ReturnType<typeof knowledgeJev>,
	luna: ReturnType<typeof knowledgeLuna>,
	value = input({ en: ["book"] }),
) =>
	Effect.runPromise(
		runOperation(
			"knowledge.accumulateTranslations",
			{ budget: requestBudget(4), payloads: true },
			(scope) =>
				accumulateHebrewTranslations(
					scope,
					{
						luna: {
							ask: luna.ask,
							configuration: defaultLunaConfiguration,
						},
						jev: { ask: jev.ask, model: pinnedJevModel },
					},
					value,
				),
		),
	);

test("Hebrew accumulation judges bare stored options and does not write when covered", async () => {
	const jev = knowledgeJev({ translation: "t0" });
	const luna = knowledgeLuna({});
	const result = await run(jev, luna, input({ en: ["book", "BOOK "] }));
	expect(result).toEqual({ changes: [], failures: [] });
	expect(luna.sent).toEqual([]);
	const request = jev.sent[0];
	expect(request?.state).toMatchObject({
		language: "en",
		markedSentence: "קראתי <TARGET>ספר</TARGET>.",
		reading: { lemma: "ספר", emojiDescription: "📚" },
	});
});

test("Hebrew NoMatch writes occurrence equivalents without stored hints and appends only new ones", async () => {
	const jev = knowledgeJev({ translation: "NoMatch" });
	const luna = knowledgeLuna({
		translationAccumulation: {
			sentence: "I read a volume.",
			equivalents: ["BOOK", "volume", "volume"],
		},
	});
	const result = await run(jev, luna);
	expect(result).toEqual({
		changes: [
			{
				kind: "Contribute",
				aspect: "translations",
				language: "en",
				value: ["volume"],
			},
		],
		failures: [],
	});
	expect(knowledgeLunaInput(luna.sent[0]?.input)).toMatchObject({
		aspect: "translationAccumulation",
		language: "en",
		markedSentence: "קראתי <TARGET>ספר</TARGET>.",
		reading: { emojiDescription: "📚" },
	});
	expect(JSON.stringify(luna.sent[0]?.input)).not.toContain("book");
});
