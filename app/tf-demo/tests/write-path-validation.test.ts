import { describe, expect, test } from "bun:test";
import {
	assertSubmittedText,
	matchesStoredAnalysis,
} from "../convex/modules/text/submission";
import { assertResolvedClickProposal } from "../convex/persistence";
import {
	lemmaIdentityKey,
	readingIdentityKey,
} from "../server/linguisticIdentity";
import { MAX_SEGMENTS_PER_SENTENCE } from "../server/storedSegments";

type Segment = {
	kind: "ResolvableText" | "Whitespace";
	text: string;
	surface?: string;
};

function sentence(
	position: number,
	words: readonly string[],
	overrides: Partial<{
		segmentedSentenceId: string;
		paragraph: number;
		stitchedText: string;
		segments: Segment[];
	}> = {},
) {
	const segments: Segment[] =
		overrides.segments ??
		words.flatMap((text, index) => [
			...(index === 0
				? []
				: [{ kind: "Whitespace" as const, text: " " }]),
			{ kind: "ResolvableText" as const, text },
		]);
	return {
		segmentedSentenceId:
			overrides.segmentedSentenceId ?? `sentence-${position}`,
		position,
		paragraph: overrides.paragraph ?? 0,
		language: "de" as const,
		stitchedText:
			overrides.stitchedText ?? segments.map(({ text }) => text).join(""),
		segments,
		units: segments.flatMap((segment, index) =>
			segment.kind === "ResolvableText"
				? [{ segments: [index], route: "Unresolved" as const }]
				: [],
		),
	};
}

function submission(sentences: ReturnType<typeof sentence>[]) {
	return {
		submissionKey: "key-1",
		sourceText: sentences.map(({ stitchedText }) => stitchedText).join(" "),
		sentences,
	};
}

describe("assertSubmittedText", () => {
	test("accepts a consistent submission", () => {
		expect(() =>
			assertSubmittedText(
				submission([
					sentence(0, ["Ich", "gehe."]),
					sentence(1, ["Du", "auch."]),
				]),
			),
		).not.toThrow();
	});

	test("rejects an empty submission key", () => {
		expect(() =>
			assertSubmittedText({
				...submission([sentence(0, ["Hallo."])]),
				submissionKey: " ",
			}),
		).toThrow("submissionKey must not be empty.");
	});

	test("rejects a negative or fractional position", () => {
		expect(() =>
			assertSubmittedText(submission([sentence(-1, ["Hallo."])])),
		).toThrow("sentence.position must be a non-negative safe integer.");
		expect(() =>
			assertSubmittedText(
				submission([sentence(0, ["Hallo."], { paragraph: 0.5 })]),
			),
		).toThrow("sentence.paragraph must be a non-negative safe integer.");
	});

	test("rejects repeated positions and Segmented Sentence IDs", () => {
		expect(() =>
			assertSubmittedText(
				submission([
					sentence(0, ["Hallo."]),
					sentence(0, ["Tschüss."], { segmentedSentenceId: "other" }),
				]),
			),
		).toThrow("Sentence positions must be unique.");
		expect(() =>
			assertSubmittedText(
				submission([
					sentence(0, ["Hallo."]),
					sentence(1, ["Tschüss."], {
						segmentedSentenceId: "sentence-0",
					}),
				]),
			),
		).toThrow("Segmented Sentence IDs must be unique.");
	});

	test("rejects a Sentence with no Segments or too many", () => {
		expect(() =>
			assertSubmittedText(
				submission([
					sentence(0, [], { segments: [], stitchedText: "x" }),
				]),
			),
		).toThrow(
			`A sentence must contain 1-${MAX_SEGMENTS_PER_SENTENCE} Segments.`,
		);
		const segments = Array.from(
			{ length: MAX_SEGMENTS_PER_SENTENCE + 1 },
			() => ({ kind: "ResolvableText" as const, text: "a" }),
		);
		expect(() =>
			assertSubmittedText(submission([sentence(0, [], { segments })])),
		).toThrow(
			`A sentence must contain 1-${MAX_SEGMENTS_PER_SENTENCE} Segments.`,
		);
	});

	test("rejects Segments that do not reconstruct the stitched text", () => {
		expect(() =>
			assertSubmittedText(
				submission([
					sentence(0, ["Hallo"], { stitchedText: "Hallo." }),
				]),
			),
		).toThrow("Segments must reconstruct stitchedText exactly.");
	});

	test("rejects an empty Segment and a non-whitespace Whitespace Segment", () => {
		expect(() =>
			assertSubmittedText(
				submission([
					sentence(0, [], {
						segments: [
							{ kind: "ResolvableText", text: "Hallo" },
							{ kind: "ResolvableText", text: "" },
						],
					}),
				]),
			),
		).toThrow("segment.text must not be empty.");
		expect(() =>
			assertSubmittedText(
				submission([
					sentence(0, [], {
						segments: [
							{ kind: "ResolvableText", text: "Hallo" },
							{ kind: "Whitespace", text: "." },
						],
					}),
				]),
			),
		).toThrow("Whitespace Segments must hold whitespace only.");
	});

	test("rejects units that do not cover the Sentence", () => {
		expect(() =>
			assertSubmittedText(
				submission([{ ...sentence(0, ["Ich", "gehe."]), units: [] }]),
			),
		).toThrow("Segment 0 belongs to no unit.");
	});
});

describe("matchesStoredAnalysis", () => {
	const submitted = [sentence(0, ["Ich", "gehe."]), sentence(1, ["Gut."])];
	const storedSentences = submitted.map(
		({ position, language, stitchedText }) => ({
			position,
			language,
			stitchedText,
		}),
	);
	const storedSegments = submitted.map(({ segments }) =>
		segments.map((segment, index) => ({ index, ...segment })),
	);

	test("holds for the exact stored analysis", () => {
		expect(
			matchesStoredAnalysis(storedSentences, storedSegments, submitted),
		).toBe(true);
	});

	test("fails when a Sentence is missing", () => {
		expect(
			matchesStoredAnalysis(
				storedSentences.slice(0, 1),
				storedSegments.slice(0, 1),
				submitted,
			),
		).toBe(false);
	});

	test("fails when a Sentence's text or position differs", () => {
		expect(
			matchesStoredAnalysis(
				[
					{ ...storedSentences[0], stitchedText: "Ich ging." },
					storedSentences[1],
				],
				storedSegments,
				submitted,
			),
		).toBe(false);
		expect(
			matchesStoredAnalysis(
				[storedSentences[0], { ...storedSentences[1], position: 2 }],
				storedSegments,
				submitted,
			),
		).toBe(false);
	});

	test("fails when a stored Segment differs or is out of place", () => {
		const [first = [], second = []] = storedSegments;
		expect(
			matchesStoredAnalysis(
				storedSentences,
				[
					first.map((segment) => ({ ...segment, surface: "x" })),
					second,
				],
				submitted,
			),
		).toBe(false);
		expect(
			matchesStoredAnalysis(
				storedSentences,
				[
					first.map((segment) => ({
						...segment,
						index: segment.index + 1,
					})),
					second,
				],
				submitted,
			),
		).toBe(false);
		expect(
			matchesStoredAnalysis(
				storedSentences,
				[first.slice(1), second],
				submitted,
			),
		).toBe(false);
	});
});

describe("assertResolvedClickProposal", () => {
	const lemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Bank",
		coreFeatures: { gender: "Fem" },
	} as const;
	const otherLemma = {
		...lemma,
		canonicalForm: "Ufer",
		coreFeatures: { gender: "Neut" },
	} as const;
	const reading = {
		unitKind: "Reading",
		lemma,
		emojiDescription: "🏦",
	} as const;

	function proposal(
		overrides: Partial<{
			readingKey: string;
			surfaceLemma: unknown;
			memberSegmentIndices: number[];
			members: unknown[];
		}> = {},
	) {
		return {
			readingKey: overrides.readingKey ?? readingIdentityKey(reading),
			reading,
			occurrence: {
				lemmaKey: lemmaIdentityKey(lemma),
				memberSegmentIndices: overrides.memberSegmentIndices ?? [0, 2],
				attestation: {
					surface: { lemma: overrides.surfaceLemma ?? lemma },
					members: overrides.members ?? [{}, {}],
				},
			},
		};
	}

	test("accepts a consistent proposal", () => {
		expect(() => assertResolvedClickProposal(proposal())).not.toThrow();
	});

	test("rejects a readingKey that is not the Reading's identity", () => {
		expect(() =>
			assertResolvedClickProposal(proposal({ readingKey: "other" })),
		).toThrow("readingKey does not match the selected Reading identity.");
	});

	test("rejects a Surface on a different Lemma", () => {
		expect(() =>
			assertResolvedClickProposal(proposal({ surfaceLemma: otherLemma })),
		).toThrow(
			"Attestation Surface and Reading must share the proposed Lemma.",
		);
	});

	test("rejects no members and a member count mismatch", () => {
		expect(() =>
			assertResolvedClickProposal(
				proposal({ memberSegmentIndices: [], members: [] }),
			),
		).toThrow("An Attestation needs at least one member Segment.");
		expect(() =>
			assertResolvedClickProposal(proposal({ members: [{}] })),
		).toThrow("Attestation members must match member Segment indices.");
	});

	test("rejects a negative, repeated or unordered member index", () => {
		expect(() =>
			assertResolvedClickProposal(
				proposal({ memberSegmentIndices: [-1, 0] }),
			),
		).toThrow("memberSegmentIndex must be a non-negative safe integer.");
		expect(() =>
			assertResolvedClickProposal(
				proposal({ memberSegmentIndices: [2, 2] }),
			),
		).toThrow(
			"Attestation member Segment indices must be ordered and unique.",
		);
		expect(() =>
			assertResolvedClickProposal(
				proposal({ memberSegmentIndices: [2, 0] }),
			),
		).toThrow(
			"Attestation member Segment indices must be ordered and unique.",
		);
	});
});
