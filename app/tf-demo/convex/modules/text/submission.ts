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
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../../_generated/server";
import { assertIndex } from "../../model/resolutionLookup";
import { loadStoredSegments } from "../../model/storedSegments";
import {
	type sentenceInputValidator,
	visitorError,
} from "../../model/validators";

type SubmittedText = {
	submissionKey: string;
	sourceText: string;
	sentences: Array<Infer<typeof sentenceInputValidator>>;
};

export type PersistedSubmittedText = {
	textId: Id<"texts">;
	sentenceIds: Array<Id<"sentences">>;
	deduplicated: boolean;
};

/**
 * The Text a re-submission would only reproduce: stored under `submissionKey`
 * with the same source text, and with every Sentence's Segments in place.
 * Null when intake still has work to do, such as after Analysis Stripping.
 */
export async function findAnalyzedSubmission(
	ctx: QueryCtx,
	input: { readonly submissionKey: string; readonly sourceText: string },
): Promise<Id<"texts"> | null> {
	const text = await ctx.db
		.query("texts")
		.withIndex("by_submission_key", (q) =>
			q.eq("submissionKey", input.submissionKey),
		)
		.unique();
	if (!text || text.sourceText !== input.sourceText) return null;
	const sentences = await ctx.db
		.query("sentences")
		.withIndex("by_text_id_and_position", (q) => q.eq("textId", text._id))
		.take(MAX_SOURCE_SENTENCES);
	if (sentences.length === 0) return null;
	for (const sentence of sentences) {
		const segments = await loadStoredSegments(ctx, sentence._id);
		if (
			segments.length === 0 ||
			segments.some(({ index }, position) => index !== position) ||
			segments.map(({ text }) => text).join("") !== sentence.stitchedText
		)
			return null;
	}
	return text._id;
}

type SubmittedSentence = SubmittedText["sentences"][number];

/** The stored Sentence fields an exact re-submission must reproduce. */
type StoredSentenceFields = {
	readonly position: number;
	readonly language: string;
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
 * positions and Segmented Sentence IDs, 1 to MAX_SEGMENTS_PER_SENTENCE
 * non-empty Segments that reconstruct the stitched text, whitespace-only
 * Whitespace Segments, and units that cover the Sentence.
 */
export function assertSubmittedText(input: SubmittedText): void {
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
		assertSubmittedSegments(sentence);
		assertSentenceUnits(sentence);
	}
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
	textId: Id<"texts">,
	submitted: SubmittedSentence,
	existing?: { readonly _id: Id<"sentences"> },
): Promise<Id<"sentences">> {
	const sentenceValue = {
		segmentedSentenceId: submitted.segmentedSentenceId,
		textId,
		position: submitted.position,
		paragraph: submitted.paragraph,
		language: submitted.language,
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
 * A retry of a stored Text: an exact stored analysis is kept, and a Text
 * whose Segments were stripped gets the submitted Sentences written over the
 * ones at the same positions.
 */
async function resumeSubmittedText(
	ctx: MutationCtx,
	existingText: Doc<"texts">,
	input: SubmittedText,
): Promise<PersistedSubmittedText> {
	if (existingText.sourceText !== input.sourceText) {
		throw new Error("submissionKey was already used for different text.");
	}
	const existingSentences = await ctx.db
		.query("sentences")
		.withIndex("by_text_id_and_position", (q) =>
			q.eq("textId", existingText._id),
		)
		.take(MAX_SOURCE_SENTENCES);
	const submittedSentences = bySentencePosition(input.sentences);
	const existingSegments = await Promise.all(
		existingSentences.map((sentence) =>
			loadStoredSegments(ctx, sentence._id),
		),
	);
	const kept = {
		textId: existingText._id,
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
				existingText._id,
				submitted,
				existingByPosition.get(submitted.position),
			),
		),
	);
	return { textId: existingText._id, sentenceIds, deduplicated: true };
}

/** A first submission: a new Text with every Sentence and its Segments. */
async function insertSubmittedText(
	ctx: MutationCtx,
	input: SubmittedText,
): Promise<PersistedSubmittedText> {
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
	const textId = await ctx.db.insert("texts", {
		submissionKey: input.submissionKey,
		sourceText: input.sourceText,
	});
	const sentenceIds = await Promise.all(
		bySentencePosition(input.sentences).map((sentence) =>
			writeSentence(ctx, textId, sentence),
		),
	);
	return { textId, sentenceIds, deduplicated: false };
}

/**
 * Persist one segmented Text, each Sentence with its Segments and units,
 * while making submission-key retries idempotent. The first complete write
 * wins: a retry that finds the same Segments keeps the stored units.
 */
export async function persistSubmittedText(
	ctx: MutationCtx,
	input: SubmittedText,
): Promise<PersistedSubmittedText> {
	assertSubmittedText(input);
	const existingText = await ctx.db
		.query("texts")
		.withIndex("by_submission_key", (q) =>
			q.eq("submissionKey", input.submissionKey),
		)
		.unique();
	return existingText
		? resumeSubmittedText(ctx, existingText, input)
		: insertSubmittedText(ctx, input);
}
