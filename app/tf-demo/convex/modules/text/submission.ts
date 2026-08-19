import type { Infer } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type { sentenceInputValidator } from "../../model/validators";

const MAX_SENTENCES_PER_SUBMISSION = 9;
const MAX_SEGMENTS_PER_SENTENCE = 512;

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

function assertNonEmpty(value: string, name: string): void {
	if (value.trim().length === 0)
		throw new Error(`${name} must not be empty.`);
}

function assertIndex(value: number, name: string): void {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(`${name} must be a non-negative safe integer.`);
	}
}

/** Persist one analyzed Text while making submission-key retries idempotent. */
export async function persistSubmittedText(
	ctx: MutationCtx,
	input: SubmittedText,
): Promise<PersistedSubmittedText> {
	assertNonEmpty(input.submissionKey, "submissionKey");
	if (input.sentences.length > MAX_SENTENCES_PER_SUBMISSION) {
		throw new Error(
			`At most ${MAX_SENTENCES_PER_SUBMISSION} sentences are allowed.`,
		);
	}
	const positions = new Set<number>();
	const sentenceKeys = new Set<string>();
	for (const sentence of input.sentences) {
		assertIndex(sentence.position, "sentence.position");
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
			if (segment.kind === "Whitespace" && segment.text !== " ") {
				throw new Error(
					"Whitespace Segments must contain one ASCII space.",
				);
			}
		}
	}

	const existingText = await ctx.db
		.query("texts")
		.withIndex("by_submission_key", (q) =>
			q.eq("submissionKey", input.submissionKey),
		)
		.unique();
	if (existingText) {
		if (existingText.sourceText !== input.sourceText) {
			throw new Error(
				"submissionKey was already used for different text.",
			);
		}
		const existingSentences = await ctx.db
			.query("sentences")
			.withIndex("by_text_id_and_position", (q) =>
				q.eq("textId", existingText._id),
			)
			.take(MAX_SENTENCES_PER_SUBMISSION);
		const submittedSentences = [...input.sentences].sort(
			(left, right) => left.position - right.position,
		);
		const existingSegments = await Promise.all(
			existingSentences.map((sentence) =>
				ctx.db
					.query("segments")
					.withIndex("by_sentence_id_and_index", (q) =>
						q.eq("sentenceId", sentence._id),
					)
					.take(MAX_SEGMENTS_PER_SENTENCE),
			),
		);
		if (existingSegments.some((segments) => segments.length > 0)) {
			const completeExactAnalysis =
				existingSentences.length === submittedSentences.length &&
				existingSentences.every((existing, sentenceIndex) => {
					const submitted = submittedSentences[sentenceIndex];
					const segments = existingSegments[sentenceIndex] ?? [];
					return (
						submitted !== undefined &&
						existing.position === submitted.position &&
						existing.segmentedSentenceId ===
							submitted.segmentedSentenceId &&
						existing.language === submitted.language &&
						existing.stitchedText === submitted.stitchedText &&
						segments.length === submitted.segments.length &&
						segments.every(
							(segment, segmentIndex) =>
								segment.index === segmentIndex &&
								segment.kind ===
									submitted.segments[segmentIndex]?.kind &&
								segment.text ===
									submitted.segments[segmentIndex]?.text,
						)
					);
				});
			if (!completeExactAnalysis) {
				throw new Error(
					"Existing Text analysis is incomplete or differs from the submitted analysis; retry after stripping completes.",
				);
			}
			return {
				textId: existingText._id,
				sentenceIds: existingSentences.map(({ _id }) => _id),
				deduplicated: true,
			};
		}
		if (submittedSentences.length === 0) {
			return {
				textId: existingText._id,
				sentenceIds: existingSentences.map(({ _id }) => _id),
				deduplicated: true,
			};
		}

		const existingByPosition = new Map(
			existingSentences.map((sentence) => [sentence.position, sentence]),
		);
		if (
			existingSentences.some(
				(sentence) => !positions.has(sentence.position),
			)
		) {
			throw new Error(
				"Existing Sentences do not match the submitted analysis.",
			);
		}
		for (const submitted of submittedSentences) {
			const existing = existingByPosition.get(submitted.position);
			const collision = await ctx.db
				.query("sentences")
				.withIndex("by_segmented_sentence_id", (q) =>
					q.eq("segmentedSentenceId", submitted.segmentedSentenceId),
				)
				.unique();
			if (collision && collision._id !== existing?._id) {
				throw new Error(
					"Segmented Sentence ID already belongs to another submission.",
				);
			}
		}

		const sentenceIds: Array<Id<"sentences">> = [];
		for (const submitted of submittedSentences) {
			const existing = existingByPosition.get(submitted.position);
			const sentenceValue = {
				segmentedSentenceId: submitted.segmentedSentenceId,
				textId: existingText._id,
				position: submitted.position,
				language: submitted.language,
				stitchedText: submitted.stitchedText,
			};
			const sentenceId =
				existing?._id ??
				(await ctx.db.insert("sentences", sentenceValue));
			if (existing) await ctx.db.replace(existing._id, sentenceValue);
			sentenceIds.push(sentenceId);
			for (const [index, segment] of submitted.segments.entries()) {
				await ctx.db.insert("segments", {
					sentenceId,
					index,
					...segment,
				});
			}
		}
		return {
			textId: existingText._id,
			sentenceIds,
			deduplicated: true,
		};
	}

	for (const sentence of input.sentences) {
		const collision = await ctx.db
			.query("sentences")
			.withIndex("by_segmented_sentence_id", (q) =>
				q.eq("segmentedSentenceId", sentence.segmentedSentenceId),
			)
			.unique();
		if (collision) {
			throw new Error(
				"Segmented Sentence ID already belongs to another submission.",
			);
		}
	}

	const textId = await ctx.db.insert("texts", {
		submissionKey: input.submissionKey,
		sourceText: input.sourceText,
	});
	const sentenceIds: Array<Id<"sentences">> = [];
	for (const sentence of [...input.sentences].sort(
		(left, right) => left.position - right.position,
	)) {
		const sentenceId = await ctx.db.insert("sentences", {
			segmentedSentenceId: sentence.segmentedSentenceId,
			textId,
			position: sentence.position,
			language: sentence.language,
			stitchedText: sentence.stitchedText,
		});
		sentenceIds.push(sentenceId);
		for (const [index, segment] of sentence.segments.entries()) {
			await ctx.db.insert("segments", {
				sentenceId,
				index,
				...segment,
			});
		}
	}
	return { textId, sentenceIds, deduplicated: false };
}
