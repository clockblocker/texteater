import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { requestBudget, runOperation } from "../../../src/call.js";
import { produceHebrewKnowledge } from "../../../src/knowledge/he/produce.js";
import { hebrewKnowledgePrompts } from "../../../src/knowledge/he/prompts.js";
import type { ProduceKnowledgeInput } from "../../../src/knowledge/types.js";
import { defaultLunaConfiguration } from "../../../src/luna.js";
import { pinnedJevModel } from "../../../src/segment/jev.js";
import { knowledgeJev, knowledgeLuna } from "../support.js";

const lemma = {
	unitKind: "Lemma",
	language: "he",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm: "עם",
	coreFeatures: { abbr: null, case: null },
} as const satisfies Dumling.Lemma<"he">;
const input = {
	language: "he",
	reading: { unitKind: "Reading", lemma, emojiDescription: "🤝" },
	attestation: {
		unitKind: "Attestation",
		surface: {
			unitKind: "Surface",
			language: "he",
			lemma,
			normalizedSurface: "עם",
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
		},
		members: [{ attested: "עם", orthography: "Standard" }],
		realizationCoverage: "Full",
	},
	sentence: {
		segments: [{ text: "הלכתי " }, { text: "עם" }, { text: " חבר לטיול." }],
		target: [1],
	},
	origin: "New",
	request: { transcription: null },
} as const satisfies ProduceKnowledgeInput<never, "he">;

const run = (
	luna: ReturnType<typeof knowledgeLuna>,
	value: ProduceKnowledgeInput<never, "he"> = input,
) =>
	Effect.runPromise(
		runOperation(
			"knowledge.produce",
			{ budget: requestBudget(1), payloads: true },
			(scope) =>
				produceHebrewKnowledge(
					scope,
					{
						luna: {
							ask: luna.ask,
							configuration: defaultLunaConfiguration,
						},
						jev: { ask: knowledgeJev().ask, model: pinnedJevModel },
					},
					value,
				),
		),
	);

test("rejects captured he22 Hebrew spelling instead of IPA", async () => {
	// Real candidate1 pilot he22-with-preposition-raw-luna-6.json output.
	const result = await run(knowledgeLuna({ transcription: "עִם" }));
	expect(result.changes).toEqual([]);
	expect(result.failures).toMatchObject([
		{ aspect: "transcription", code: "InvalidModelOutput" },
	]);
});

test("transcription receives pointed occurrence evidence separately from canonical lemma", async () => {
	const nounLemma = {
		...lemma,
		kind: "NOUN",
		canonicalForm: "ספר",
		coreFeatures: { gender: "Masc", abbr: null },
	} as const satisfies Dumling.Lemma<"he">;
	const luna = knowledgeLuna({ transcription: "saˈpaʁ" });
	await run(luna, {
		...input,
		reading: {
			unitKind: "Reading",
			lemma: nounLemma,
			emojiDescription: "💈",
		},
		attestation: {
			...input.attestation,
			surface: {
				...input.attestation.surface,
				lemma: nounLemma,
				normalizedSurface: "ספרים",
				inflectionalFeatures: { number: "Plur", definite: "Ind" },
			},
			members: [{ attested: "סַפָּרִים", orthography: "Standard" }],
			articleEvidence: null,
			valencyEvidence: [],
		},
		sentence: {
			segments: [
				{ text: "שני " },
				{ text: "סַפָּרִים" },
				{ text: " גזרו שיער." },
			],
			target: [1],
		},
	});
	expect(luna.sent[0]?.input).toMatchObject({
		reading: { lemma: "ספר", emojiDescription: "💈" },
		markedSentence: "שני <TARGET>סַפָּרִים</TARGET> גזרו שיער.",
		occurrence: {
			source: "סַפָּרִים",
			normalizedSurface: "ספרים",
			inflectionalFeatures: { number: "Plur", definite: "Ind" },
		},
	});
});

test("pronunciation guidance uses occurrence vowels to identify sense, not to copy inflection", () => {
	const prompt = hebrewKnowledgePrompts.transcription;
	expect(prompt).toContain("pointed occurrence");
	expect(prompt).toContain("unpointed canonical Lemma");
	expect(prompt).toContain("canonical headword of the resolved sense");
	expect(prompt).toContain("not Hebrew-script spelling");
});

test("paradigm guidance prioritizes sparse reliable cells over quota-filling", () => {
	const prompt = hebrewKnowledgePrompts.hebrewParadigm;
	expect(prompt).toContain("Prefer 1–4");
	expect(prompt).not.toContain("Prefer 4–8");
	expect(prompt).toContain("not a quota");
	expect(prompt).toContain("Do not fill space with article variants");
	expect(prompt).toContain("omit any cell whose vocalization is uncertain");
});

test("IPA guard permits ordinary and non-ASCII IPA without requiring invented stress", async () => {
	for (const transcription of ["im", "ʔim", "ʕim", "/im/"]) {
		const result = await run(knowledgeLuna({ transcription }));
		expect(result.failures).toEqual([]);
		expect(result.changes).toMatchObject([
			{
				aspect: "transcription",
				value: transcription.replaceAll("/", ""),
			},
		]);
	}
});
