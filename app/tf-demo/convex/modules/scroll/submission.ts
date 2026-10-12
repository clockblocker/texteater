import type { Infer } from "convex/values";
import { assertNonEmpty } from "../../../server/identifiers";
import {
	assertSentenceUnits,
	MAX_SEGMENTS_PER_SENTENCE,
} from "../../../server/storedSegments";
import {
	assertTextSubmissionWithinLimits,
	MAX_SOURCE_SENTENCES,
} from "../../../server/textSubmissionLimits";
import { isPlainSentence } from "../../../shared/supported-target-language";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { assertIndex } from "../../model/resolutionLookup";
import { loadStoredSegments } from "../../model/storedSegments";
import {
	type sentenceInputValidator,
	visitorError,
} from "../../model/validators";

type SubmittedScroll = {
	submissionKey: string;
	sourceText: string;
	/**
	 * The Scroll's Extracted Text, Dumgen's `Scroll`, stored unchecked
	 * (`v.any()`); intake always hands one, fixtures that write a Scroll
	 * directly need none.
	 */
	extractedText?: unknown;
	sentences: Array<Infer<typeof sentenceInputValidator>>;
};

export type PersistedSubmittedScroll = {
	scrollId: Id<"scrolls">;
	sentenceIds: Array<Id<"sentences">>;
	deduplicated: boolean;
};

/**
 * The Scroll a re-submission would only reproduce: stored under `submissionKey`
 * with the same source text, and with the Segments of every Sentence but a
 * Plain one in place. Null when intake still has work to do, such as after
 * Analysis Stripping.
 */
export async function findAnalyzedSubmission(
	ctx: QueryCtx,
	input: { readonly submissionKey: string; readonly sourceText: string },
): Promise<Id<"scrolls"> | null> {
	const scroll = await ctx.db
		.query("scrolls")
		.withIndex("by_submission_key", (q) =>
			q.eq("submissionKey", input.submissionKey),
		)
		.unique();
	if (!scroll || scroll.sourceText !== input.sourceText) return null;
	const sentences = await ctx.db
		.query("sentences")
		.withIndex("by_scroll_id_and_position", (q) =>
			q.eq("scrollId", scroll._id),
		)
		.take(MAX_SOURCE_SENTENCES);
	if (sentences.length === 0) return null;
	for (const sentence of sentences) {
		if (isPlainSentence(sentence.language)) continue;
		const segments = await loadStoredSegments(ctx, sentence._id);
		if (
			segments.length === 0 ||
			segments.some(({ index }, position) => index !== position) ||
			segments.map(({ text }) => text).join("") !== sentence.stitchedText
		)
			return null;
	}
	return scroll._id;
}

/**
 * The Extracted Text stored for `submissionKey` with the same source text,
 * unchecked, or null when there is none to re-run from.
 */
export async function findStoredExtractedText(
	ctx: QueryCtx,
	input: { readonly submissionKey: string; readonly sourceText: string },
): Promise<unknown> {
	const scroll = await ctx.db
		.query("scrolls")
		.withIndex("by_submission_key", (q) =>
			q.eq("submissionKey", input.submissionKey),
		)
		.unique();
	return scroll?.sourceText === input.sourceText
		? (scroll.extractedText ?? null)
		: null;
}

type SubmittedSentence = SubmittedScroll["sentences"][number];

/** The stored Sentence fields an exact re-submission must reproduce. */
type StoredSentenceFields = {
	readonly position: number;
	readonly language?: string;
	readonly stitchedText: string;
};

/** The stored Segment fields an exact re-submission must reproduce. */
type StoredSegmentFields = {
	readonly index: number;
	readonly kind: string;
	readonly text: string;
	readonly surface?: string;
};

/**
 * The submission's own consistency, checked before anything is read: unique
 * positions and Segmented Sentence IDs; for a target-language Sentence, 1 to
 * MAX_SEGMENTS_PER_SENTENCE non-empty Segments that reconstruct the
 * stitched text, whitespace-only Whitespace Segments, and units that cover
 * the Sentence; for a Plain Sentence, no Segments and no units.
 */
export function assertSubmittedScroll(input: SubmittedScroll): void {
	assertNonEmpty(input.submissionKey, "submissionKey");
	assertTextSubmissionWithinLimits(
		input.sourceText,
		input.sentences.map(({ stitchedText }) => stitchedText),
	);
	const positions = new Set<number>();
	const sentenceKeys = new Set<string>();
	for (const sentence of input.sentences) {
		assertIndex(sentence.position, "sentence.position");
		assertIndex(sentence.paragraph, "sentence.paragraph");
		assertNonEmpty(sentence.segmentedSentenceId, "segmentedSentenceId");
		assertNonEmpty(sentence.stitchedText, "stitchedText");
		if (positions.has(sentence.position)) {
			throw new Error("Sentence positions must be unique.");
		}
		if (sentenceKeys.has(sentence.segmentedSentenceId)) {
			throw new Error("Segmented Sentence IDs must be unique.");
		}
		positions.add(sentence.position);
		sentenceKeys.add(sentence.segmentedSentenceId);
		if (isPlainSentence(sentence.language)) {
			assertPlainSentence(sentence);
			continue;
		}
		assertSubmittedSegments(sentence);
		assertSentenceUnits(sentence);
	}
}

function assertPlainSentence(sentence: SubmittedSentence): void {
	if (
		sentence.segments.length > 0 ||
		sentence.units.length > 0 ||
		sentence.segmentationFailed
	)
		throw new Error("A Plain Sentence stores no Segments and no units.");
}

function assertSubmittedSegments(sentence: SubmittedSentence): void {
	if (
		sentence.segments.length === 0 ||
		sentence.segments.length > MAX_SEGMENTS_PER_SENTENCE
	) {
		throw new Error(
			`A sentence must contain 1-${MAX_SEGMENTS_PER_SENTENCE} Segments.`,
		);
	}
	if (
		sentence.segments.map(({ text }) => text).join("") !==
		sentence.stitchedText
	) {
		throw new Error("Segments must reconstruct stitchedText exactly.");
	}
	for (const segment of sentence.segments) {
		if (segment.text.length === 0) {
			throw new Error("segment.text must not be empty.");
		}
		if (segment.kind === "Whitespace" && !/^\s+$/u.test(segment.text)) {
			throw new Error("Whitespace Segments must hold whitespace only.");
		}
	}
}

/**
 * Whether the stored Sentences and their Segments are exactly the submitted
 * analysis, Sentence for Sentence in position order.
 */
export function matchesStoredAnalysis(
	existingSentences: readonly StoredSentenceFields[],
	existingSegments: readonly (readonly StoredSegmentFields[])[],
	submitted: readonly SubmittedSentence[],
): boolean {
	return (
		existingSentences.length === submitted.length &&
		existingSentences.every((existing, sentenceIndex) => {
			const sentence = submitted[sentenceIndex];
			const segments = existingSegments[sentenceIndex] ?? [];
			return (
				sentence !== undefined &&
				existing.position === sentence.position &&
				existing.language === sentence.language &&
				existing.stitchedText === sentence.stitchedText &&
				segments.length === sentence.segments.length &&
				segments.every(
					(segment, segmentIndex) =>
						segment.index === segmentIndex &&
						segment.kind ===
							sentence.segments[segmentIndex]?.kind &&
						segment.text ===
							sentence.segments[segmentIndex]?.text &&
						segment.surface ===
							sentence.segments[segmentIndex]?.surface,
				)
			);
		})
	);
}

/**
 * Writes one submitted Sentence and its Segments: replaces the stored
 * Sentence at that position when there is one, and inserts it otherwise.
 */
async function writeSentence(
	ctx: MutationCtx,
	scrollId: Id<"scrolls">,
	submitted: SubmittedSentence,
	existing?: { readonly _id: Id<"sentences"> },
): Promise<Id<"sentences">> {
	const sentenceValue = {
		segmentedSentenceId: submitted.segmentedSentenceId,
		scrollId,
		position: submitted.position,
		paragraph: submitted.paragraph,
		...(submitted.language === undefined
			? {}
			: { language: submitted.language }),
		stitchedText: submitted.stitchedText,
		units: submitted.units,
		...(submitted.segmentationFailed
			? { segmentationFailed: true as const }
			: {}),
	};
	const sentenceId =
		existing?._id ?? (await ctx.db.insert("sentences", sentenceValue));
	if (existing) await ctx.db.replace(existing._id, sentenceValue);
	await Promise.all(
		submitted.segments.map((segment, index) =>
			ctx.db.insert("segments", {
				sentenceId,
				index,
				...segment,
			}),
		),
	);
	return sentenceId;
}

function bySentencePosition(sentences: readonly SubmittedSentence[]) {
	return [...sentences].sort((left, right) => left.position - right.position);
}

function findSentenceBySegmentedId(ctx: QueryCtx, segmentedSentenceId: string) {
	return ctx.db
		.query("sentences")
		.withIndex("by_segmented_sentence_id", (q) =>
			q.eq("segmentedSentenceId", segmentedSentenceId),
		)
		.unique();
}

/**
 * A retry of a stored Scroll: an exact stored analysis is kept, and a Scroll
 * whose Segments were stripped gets the submitted Sentences written over the
 * ones at the same positions.
 */
async function resumeSubmittedScroll(
	ctx: MutationCtx,
	existingScroll: Doc<"scrolls">,
	input: SubmittedScroll,
): Promise<PersistedSubmittedScroll> {
	if (existingScroll.sourceText !== input.sourceText) {
		throw new Error("submissionKey was already used for different text.");
	}
	const existingSentences = await ctx.db
		.query("sentences")
		.withIndex("by_scroll_id_and_position", (q) =>
			q.eq("scrollId", existingScroll._id),
		)
		.take(MAX_SOURCE_SENTENCES);
	const submittedSentences = bySentencePosition(input.sentences);
	const existingSegments = await Promise.all(
		existingSentences.map((sentence) =>
			loadStoredSegments(ctx, sentence._id),
		),
	);
	const kept = {
		scrollId: existingScroll._id,
		sentenceIds: existingSentences.map(({ _id }) => _id),
		deduplicated: true,
	};
	if (existingSegments.some((segments) => segments.length > 0)) {
		if (
			!matchesStoredAnalysis(
				existingSentences,
				existingSegments,
				submittedSentences,
			)
		) {
			throw visitorError(
				"Conflict",
				"Existing Text analysis is incomplete or differs from the submitted analysis; retry after stripping completes.",
			);
		}
		return kept;
	}
	if (submittedSentences.length === 0) return kept;

	const positions = new Set(input.sentences.map(({ position }) => position));
	const existingByPosition = new Map(
		existingSentences.map((sentence) => [sentence.position, sentence]),
	);
	if (
		existingSentences.some((sentence) => !positions.has(sentence.position))
	) {
		throw new Error(
			"Existing Sentences do not match the submitted analysis.",
		);
	}
	const collisions = await Promise.all(
		submittedSentences.map((submitted) =>
			findSentenceBySegmentedId(ctx, submitted.segmentedSentenceId),
		),
	);
	for (const [index, submitted] of submittedSentences.entries()) {
		const existing = existingByPosition.get(submitted.position);
		const collision = collisions[index];
		if (collision && collision._id !== existing?._id) {
			throw new Error(
				"Segmented Sentence ID already belongs to another submission.",
			);
		}
	}

	const sentenceIds = await Promise.all(
		submittedSentences.map((submitted) =>
			writeSentence(
				ctx,
				existingScroll._id,
				submitted,
				existingByPosition.get(submitted.position),
			),
		),
	);
	return { scrollId: existingScroll._id, sentenceIds, deduplicated: true };
}

/** A first submission: a new Scroll with every Sentence and its Segments. */
async function insertSubmittedScroll(
	ctx: MutationCtx,
	input: SubmittedScroll,
): Promise<PersistedSubmittedScroll> {
	const collisions = await Promise.all(
		input.sentences.map((sentence) =>
			findSentenceBySegmentedId(ctx, sentence.segmentedSentenceId),
		),
	);
	if (collisions.some(Boolean)) {
		throw new Error(
			"Segmented Sentence ID already belongs to another submission.",
		);
	}
	const scrollId = await ctx.db.insert("scrolls", {
		submissionKey: input.submissionKey,
		sourceText: input.sourceText,
		...(input.extractedText === undefined
			? {}
			: { extractedText: input.extractedText }),
	});
	const sentenceIds = await Promise.all(
		bySentencePosition(input.sentences).map((sentence) =>
			writeSentence(ctx, scrollId, sentence),
		),
	);
	return { scrollId, sentenceIds, deduplicated: false };
}

/**
 * Persist one segmented Scroll, each Sentence with its Segments and units,
 * while making submission-key retries idempotent. The first complete write
 * wins: a retry that finds the same Segments keeps the stored units.
 */
export async function persistSubmittedScroll(
	ctx: MutationCtx,
	input: SubmittedScroll,
): Promise<PersistedSubmittedScroll> {
	assertSubmittedScroll(input);
	const existingScroll = await ctx.db
		.query("scrolls")
		.withIndex("by_submission_key", (q) =>
			q.eq("submissionKey", input.submissionKey),
		)
		.unique();
	return existingScroll
		? resumeSubmittedScroll(ctx, existingScroll, input)
		: insertSubmittedScroll(ctx, input);
}
