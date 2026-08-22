import { describe, expect, test } from "bun:test";
import type {
	Dumgen,
	GrammaticalInput,
	GrammaticalResult,
	KnowledgeGenerationInput,
	KnowledgeGenerationRequest,
	KnowledgeGenerationResult,
	RequestableRelation,
	Segment,
	SegmentedSentence,
	SegmentedSentenceId,
} from "dumgen";
import {
	grammaticalInputSchema,
	grammaticalInteractionSchema,
	grammaticalResultSchema,
	grammaticalRouteSchema,
	knowledgeGenerationInputSchema,
	knowledgeGenerationLanguageSchema,
	knowledgeGenerationRequestSchema,
	knowledgeGenerationResultSchema,
	requestableRelationSchema,
	resolvedGrammaticalResultSchema,
	segmentationDecisionSchema,
	segmentationResultSchema,
	segmentedSentenceSchema,
	segmentSchema,
} from "dumgen/schema";
import type { z } from "zod";

import {
	DE_ENABLED_GRAMMATICAL_RESOLUTION_ROUTES,
	DE_NOT_IMPLEMENTED_GRAMMATICAL_RESOLUTION_ROUTES,
} from "../../src/schema/de-grammatical-resolution-inventory";

type Equal<Left, Right> =
	(<Value>() => Value extends Left ? 1 : 2) extends <
		Value,
	>() => Value extends Right ? 1 : 2
		? true
		: false;
type Expect<Value extends true> = Value;

type _SegmentComesFromSchema = Expect<
	Equal<Segment, z.output<typeof segmentSchema>>
>;
type _GermanSentenceKeepsLanguage = Expect<
	Equal<SegmentedSentence<"de">["language"], "de">
>;
// @ts-expect-error English has no enabled Dumgen Source Segmentation route.
type _EnglishSentenceIsRejected = SegmentedSentence<"en">;
type _GermanInputKeepsLanguage = Expect<
	Equal<GrammaticalInput<"de">["sentence"]["language"], "de">
>;
type _GermanResultKeepsLanguage = Expect<
	Equal<GrammaticalResult<"de">["language"], "de">
>;
type _PlainStringIsNotSegmentedSentenceId = Expect<
	Equal<string extends SegmentedSentenceId ? true : false, false>
>;
type _KnowledgeInputComesFromSchema = Expect<
	Equal<
		KnowledgeGenerationInput<"de">,
		z.output<typeof knowledgeGenerationInputSchema>
	>
>;
type _KnowledgeResultComesFromSchema = Expect<
	Equal<
		KnowledgeGenerationResult,
		z.output<typeof knowledgeGenerationResultSchema>
	>
>;
type _RequestableRelationComesFromSchema = Expect<
	Equal<RequestableRelation, z.infer<typeof requestableRelationSchema>>
>;
// @ts-expect-error English has no configured Dumgen Knowledge generation route.
type _EnglishKnowledgeInputIsRejected = KnowledgeGenerationInput<"en">;

function assertKnowledgeLanguageIsTyped(
	dumgen: Dumgen,
	input: KnowledgeGenerationInput<"de">,
) {
	void dumgen.generate.knowledge("de", input);
	// @ts-expect-error Only German Knowledge generation is public.
	void dumgen.generate.knowledge("en", input);
}
void assertKnowledgeLanguageIsTyped;

const germanKnowledgeRequest = {
	transcription: null,
	semanticRelations: { synonym: null },
} satisfies KnowledgeGenerationRequest;
void germanKnowledgeRequest;

const inverseOnlyKnowledgeRequest: KnowledgeGenerationRequest = {
	semanticRelations: {
		// @ts-expect-error Hyponym is inverse-only and cannot be requested.
		hyponym: null,
	},
};
void inverseOnlyKnowledgeRequest;

const structuredKnowledgeRequest: KnowledgeGenerationRequest = {
	// @ts-expect-error Structured Knowledge leaves use separate future workflows.
	morphologicalTree: null,
};
void structuredKnowledgeRequest;

function assertGeneratedKnowledgeIsImmutable(
	generatedKnowledge: KnowledgeGenerationResult,
) {
	if ("decision" in generatedKnowledge) return;
	// @ts-expect-error Generated Knowledge results are immutable at the public seam.
	generatedKnowledge.changes.push();
	const firstPending = generatedKnowledge.pendingRelations[0];
	if (firstPending !== undefined) {
		// @ts-expect-error Generated relation targets are immutable at the public seam.
		firstPending.target.canonicalForm = "changed";
	}
}
void assertGeneratedKnowledgeIsImmutable;

describe("public Dumgen runtime schemas", () => {
	test("validates the concrete German Knowledge request and result contracts", () => {
		expect(knowledgeGenerationLanguageSchema.safeParse("de").success).toBe(
			true,
		);
		expect(knowledgeGenerationLanguageSchema.safeParse("en").success).toBe(
			false,
		);
		expect(knowledgeGenerationRequestSchema.safeParse({}).success).toBe(
			true,
		);
		expect(
			knowledgeGenerationRequestSchema.safeParse({
				definition: null,
				translations: { en: null },
				semanticRelations: { synonym: null, antonym: null },
			}).success,
		).toBe(true);
		expect(requestableRelationSchema.options).toEqual([
			"synonym",
			"nearSynonym",
			"antonym",
			"nearAntonym",
			"hypernym",
			"holonym",
		]);
		for (const request of [
			{ morphologicalTree: null },
			{ lexicalBreakdown: null },
			{ translations: {} },
			{ semanticRelations: {} },
			{ semanticRelations: { hyponym: null } },
			{ semanticRelations: { meronym: null } },
		]) {
			expect(
				knowledgeGenerationRequestSchema.safeParse(request).success,
			).toBe(false);
		}

		const reading = {
			lemma: {
				language: "de",
				canonicalForm: "Bank",
				family: "Lexeme",
				kind: "NOUN",
				coreFeatures: { gender: "Fem", hyph: null },
			},
			emojiDescription: "🏦",
		};
		expect(
			knowledgeGenerationInputSchema.safeParse({
				markedContext: "Die <TARGET>Bank</TARGET> öffnet.",
				reading,
				request: {},
			}).success,
		).toBe(true);
		expect(
			knowledgeGenerationInputSchema.safeParse({
				markedContext: "The <TARGET>bank</TARGET> opens.",
				reading: {
					...reading,
					lemma: { ...reading.lemma, language: "en" },
				},
				request: {},
			}).success,
		).toBe(false);

		const result = knowledgeGenerationResultSchema.parse({
			changes: [
				{
					kind: "Contribute",
					aspect: "definition",
					value: "Geldinstitut",
				},
			],
			pendingRelations: [
				{
					relation: "hypernym",
					target: {
						language: "de",
						canonicalForm: "Finanzinstitut",
						family: "Lexeme",
						kind: "NOUN",
					},
				},
			],
		});
		if ("decision" in result)
			throw new Error("Expected Knowledge success.");
		expect(Object.isFrozen(result)).toBe(true);
		expect(Object.isFrozen(result.changes[0])).toBe(true);
		expect(Object.isFrozen(result.pendingRelations[0]?.target)).toBe(true);
		expect(
			knowledgeGenerationResultSchema.safeParse({
				changes: [
					{
						kind: "Contribute",
						aspect: "translations",
						language: "de",
						value: ["Bank"],
					},
				],
				pendingRelations: [],
			}).success,
		).toBe(false);
		for (const pendingRelations of [
			[
				{
					relation: "hyponym",
					target: {
						language: "de",
						canonicalForm: "Bank",
						family: "Lexeme",
						kind: "NOUN",
					},
				},
			],
			[
				{
					relation: "hypernym",
					target: {
						language: "de",
						canonicalForm: "un-",
						family: "Morpheme",
						kind: "Prefix",
					},
				},
			],
			[
				{
					relation: "hypernym",
					target: {
						language: "de",
						canonicalForm: "im",
						family: "Construction",
						kind: "Fusion",
					},
				},
			],
		]) {
			expect(
				knowledgeGenerationResultSchema.safeParse({
					changes: [],
					pendingRelations,
				}).success,
			).toBe(false);
		}
	});

	test("validates Segment invariants without widening the inferred contract", () => {
		expect(
			segmentSchema.safeParse({
				kind: "ResolvableText",
				text: "Banken",
			}).success,
		).toBe(true);
		expect(
			segmentSchema.safeParse({ kind: "OpaqueText", text: "" }).success,
		).toBe(false);
		expect(
			segmentSchema.safeParse({ kind: "Whitespace", text: "  " }).success,
		).toBe(false);
		expect(
			segmentSchema.safeParse({
				kind: "Punctuation",
				text: ".",
				extra: true,
			}).success,
		).toBe(false);
	});

	test("keeps accepted decision and Segmented Sentence languages correlated", () => {
		const germanSentence = {
			id: "sentence-1",
			language: "de",
			segments: [{ kind: "ResolvableText", text: "Banken" }],
		};

		expect(segmentedSentenceSchema.safeParse(germanSentence).success).toBe(
			true,
		);
		expect(
			segmentationDecisionSchema.safeParse({
				decision: "Accepted",
				language: "de",
				sentence: germanSentence,
			}).success,
		).toBe(true);
		expect(
			segmentationDecisionSchema.safeParse({
				decision: "Accepted",
				language: "he",
				sentence: germanSentence,
			}).success,
		).toBe(false);
	});

	test("parses immutable Segmentation Results at the public seam", () => {
		const result = segmentationResultSchema.parse({
			ok: true,
			value: [
				{
					decision: "Accepted",
					language: "he",
					sentence: {
						id: "sentence-2",
						language: "he",
						segments: [{ kind: "ResolvableText", text: "שלום" }],
					},
				},
			],
		});

		expect(Object.isFrozen(result)).toBe(true);
		if (!result.ok || result.value[0]?.decision !== "Accepted") return;
		expect(Object.isFrozen(result.value)).toBe(true);
		expect(Object.isFrozen(result.value[0].sentence)).toBe(true);
		expect(Object.isFrozen(result.value[0].sentence.segments)).toBe(true);
	});

	test("validates every German route with Family/Kind correlation", () => {
		for (const route of [
			...DE_ENABLED_GRAMMATICAL_RESOLUTION_ROUTES,
			...DE_NOT_IMPLEMENTED_GRAMMATICAL_RESOLUTION_ROUTES,
		]) {
			expect(grammaticalRouteSchema.safeParse(route).success).toBe(true);
		}

		expect(
			grammaticalRouteSchema.safeParse({
				family: "Construction",
				kind: "NOUN",
			}).success,
		).toBe(false);
	});

	test("requires a non-empty ordered interaction membership shape", () => {
		expect(
			grammaticalInteractionSchema.safeParse({
				segmentedSentenceId: "sentence-1",
				clickedSegmentIndex: 2,
				memberSegmentIndices: [0, 2],
			}).success,
		).toBe(true);
		expect(
			grammaticalInteractionSchema.safeParse({
				segmentedSentenceId: "sentence-1",
				clickedSegmentIndex: 2,
				memberSegmentIndices: [],
			}).success,
		).toBe(false);
		expect(
			grammaticalInteractionSchema.safeParse({
				segmentedSentenceId: "sentence-1",
				clickedSegmentIndex: 2,
				memberSegmentIndices: [2, 0],
			}).success,
		).toBe(false);
		expect(
			grammaticalInteractionSchema.safeParse({
				segmentedSentenceId: "sentence-1",
				clickedSegmentIndex: 2,
				memberSegmentIndices: [0, 1],
			}).success,
		).toBe(false);
	});

	test("requires a grammatical click to target ResolvableText", () => {
		const sentence = {
			id: "sentence-1",
			language: "de",
			segments: [
				{ kind: "ResolvableText", text: "Banken" },
				{ kind: "Punctuation", text: "." },
			],
		};

		expect(
			grammaticalInputSchema.safeParse({
				sentence,
				clickedSegmentIndex: 0,
			}).success,
		).toBe(true);
		expect(
			grammaticalInputSchema.safeParse({
				sentence,
				clickedSegmentIndex: 1,
			}).success,
		).toBe(false);
	});

	test("composes Dumling Attestation validation into Resolved results", () => {
		const resolved = {
			decision: "Resolved",
			language: "de",
			markedContext: "<TARGET>im</TARGET>",
			attestation: {
				members: [{ attested: "im", orthography: "Standard" }],
				realizationCoverage: "Full",
				surface: {
					language: "de",
					normalizedSurface: "im",
					spelling: "Canonical",
					surfaceKind: "Citation",
					surfaceFeatures: null,
					lemma: {
						language: "de",
						canonicalForm: "im",
						family: "Construction",
						kind: "Fusion",
						coreFeatures: {},
					},
				},
			},
			interaction: {
				segmentedSentenceId: "sentence-1",
				clickedSegmentIndex: 0,
				memberSegmentIndices: [0],
			},
		};

		expect(
			resolvedGrammaticalResultSchema.safeParse(resolved).success,
		).toBe(true);
		expect(grammaticalResultSchema.safeParse(resolved).success).toBe(true);
		expect(
			grammaticalResultSchema.safeParse({
				...resolved,
				attestation: {
					...resolved.attestation,
					surface: {
						...resolved.attestation.surface,
						language: "he",
					},
				},
			}).success,
		).toBe(false);
	});

	test("correlates Catalog Miss routes with their candidate Lemma", () => {
		const lemmaMiss = {
			decision: "CatalogMiss",
			reason: "MemberNotCatalogued",
			language: "de",
			route: { family: "Lexeme", kind: "NOUN" },
			stage: "Lemma",
			candidate: {
				language: "de",
				canonicalForm: "Bank",
				family: "Lexeme",
				kind: "NOUN",
				coreFeatures: { gender: "Fem", hyph: null },
			},
		} as const;
		const knowledgeMiss = {
			...lemmaMiss,
			stage: "ReadingKnowledge",
			reading: { lemma: lemmaMiss.candidate, emojiDescription: "🏦" },
			missingRequest: { definition: null },
		} as const;
		const { candidate: _candidate, ...readingKnowledgeMiss } =
			knowledgeMiss;

		expect(grammaticalResultSchema.safeParse(lemmaMiss).success).toBe(true);
		expect(
			grammaticalResultSchema.safeParse({
				...lemmaMiss,
				route: { family: "Lexeme", kind: "VERB" },
			}).success,
		).toBe(false);
		expect(
			knowledgeGenerationResultSchema.safeParse(readingKnowledgeMiss)
				.success,
		).toBe(true);
		expect(
			knowledgeGenerationResultSchema.safeParse({
				...readingKnowledgeMiss,
				route: { family: "Morpheme", kind: "Prefix" },
			}).success,
		).toBe(false);
	});
});
