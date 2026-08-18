import { describe, expect, test } from "bun:test";
import type {
	GrammaticalInput,
	GrammaticalResult,
	Segment,
	SegmentedSentence,
	SegmentedSentenceId,
} from "dumgen";
import {
	grammaticalInputSchema,
	grammaticalInteractionSchema,
	grammaticalResultSchema,
	grammaticalRouteSchema,
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

describe("public Dumgen runtime schemas", () => {
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
});
