import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "./_generated/server";
import {
	resolutionKeyFor,
	resolvedContextKeyFor,
	visitorResolvedClickKeyFor,
} from "./model/linguisticKeys";
import {
	grammaticalResolutionInputValidator,
	knowledgeOwnerKindValidator,
	sentenceInputValidator,
} from "./model/validators";

const MAX_SENTENCES_PER_SUBMISSION = 9;
const MAX_SEGMENTS_PER_SENTENCE = 512;

function assertNonEmpty(value: string, name: string): void {
	if (value.trim().length === 0)
		throw new Error(`${name} must not be empty.`);
}

function assertIndex(value: number, name: string): void {
	if (!Number.isSafeInteger(value) || value < 0) {
		throw new Error(`${name} must be a non-negative safe integer.`);
	}
}

function assertVisitorInput(visitorId: string, requestId: string): void {
	assertNonEmpty(visitorId, "visitorId");
	assertNonEmpty(requestId, "requestId");
	if (visitorId.length > 200 || requestId.length > 200) {
		throw new Error(
			"Visitor and request identifiers are limited to 200 characters.",
		);
	}
}

async function requireClickableSegment(
	ctx: MutationCtx,
	sentenceId: Id<"sentences">,
	clickedSegmentIndex: number,
) {
	assertIndex(clickedSegmentIndex, "clickedSegmentIndex");
	const sentence = await ctx.db.get(sentenceId);
	if (!sentence) throw new Error("Sentence does not exist.");
	const segment = await ctx.db
		.query("segments")
		.withIndex("by_sentence_id_and_index", (q) =>
			q.eq("sentenceId", sentenceId).eq("index", clickedSegmentIndex),
		)
		.unique();
	if (segment?.kind !== "ResolvableText") {
		throw new Error("Only a ResolvableText Segment can be clicked.");
	}
	return { sentence, segment };
}

async function findClickByRequestId(ctx: MutationCtx, requestId: string) {
	return ctx.db
		.query("visitorClicks")
		.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
		.unique();
}

function assertMatchingRetry(
	click: {
		visitorId: string;
		sentenceId: Id<"sentences">;
		clickedSegmentIndex: number;
	},
	args: {
		visitorId: string;
		sentenceId: Id<"sentences">;
		clickedSegmentIndex: number;
	},
): void {
	if (
		click.visitorId !== args.visitorId ||
		click.sentenceId !== args.sentenceId ||
		click.clickedSegmentIndex !== args.clickedSegmentIndex
	) {
		throw new Error("requestId was already used for a different click.");
	}
}

async function recordResolvedVisitorClick(
	ctx: MutationCtx,
	args: {
		requestId: string;
		visitorId: string;
		sentenceId: Id<"sentences">;
		clickedSegmentIndex: number;
	},
	resolvedContext: Doc<"resolvedContexts">,
) {
	assertVisitorInput(args.visitorId, args.requestId);
	await requireClickableSegment(
		ctx,
		args.sentenceId,
		args.clickedSegmentIndex,
	);
	if (
		resolvedContext.sentenceId !== args.sentenceId ||
		resolvedContext.clickedSegmentIndex !== args.clickedSegmentIndex
	) {
		throw new Error("Resolved Segment Context does not match the click.");
	}

	const existingClick = await findClickByRequestId(ctx, args.requestId);
	if (existingClick) {
		assertMatchingRetry(existingClick, args);
		const visitorContext = await ctx.db
			.query("visitorResolvedContexts")
			.withIndex("by_click_id", (q) => q.eq("clickId", existingClick._id))
			.unique();
		if (!visitorContext) {
			throw new Error("requestId already records an unresolved click.");
		}
		return {
			clickId: existingClick._id,
			resolutionId: resolvedContext.resolutionId,
			readingId: resolvedContext.readingId,
			resolvedContextId: resolvedContext._id,
			contextId: visitorContext._id,
			deduplicated: true,
		};
	}

	const now = Date.now();
	const clickId = await ctx.db.insert("visitorClicks", {
		...args,
		resolutionId: resolvedContext.resolutionId,
		resolvedContextId: resolvedContext._id,
		clickedAt: now,
	});
	const contextKey = visitorResolvedClickKeyFor(
		args.visitorId,
		resolvedContext.contextKey,
	);
	const existingVisitorContext = await ctx.db
		.query("visitorResolvedContexts")
		.withIndex("by_context_key", (q) => q.eq("contextKey", contextKey))
		.unique();
	const contextValue = {
		contextKey,
		visitorId: args.visitorId,
		clickId,
		resolvedContextId: resolvedContext._id,
		resolvedAt: now,
	};
	let contextId: Id<"visitorResolvedContexts">;
	if (existingVisitorContext) {
		await ctx.db.replace(existingVisitorContext._id, contextValue);
		contextId = existingVisitorContext._id;
	} else {
		contextId = await ctx.db.insert(
			"visitorResolvedContexts",
			contextValue,
		);
	}
	return {
		clickId,
		resolutionId: resolvedContext.resolutionId,
		readingId: resolvedContext.readingId,
		resolvedContextId: resolvedContext._id,
		contextId,
		deduplicated: false,
	};
}

export const persistSubmittedText = internalMutation({
	args: {
		submissionKey: v.string(),
		sourceText: v.string(),
		sentences: v.array(sentenceInputValidator),
	},
	returns: v.object({
		textId: v.id("texts"),
		sentenceIds: v.array(v.id("sentences")),
		deduplicated: v.boolean(),
	}),
	handler: async (ctx, args) => {
		assertNonEmpty(args.submissionKey, "submissionKey");
		if (args.sentences.length > MAX_SENTENCES_PER_SUBMISSION) {
			throw new Error(
				`At most ${MAX_SENTENCES_PER_SUBMISSION} sentences are allowed.`,
			);
		}

		const existingText = await ctx.db
			.query("texts")
			.withIndex("by_submission_key", (q) =>
				q.eq("submissionKey", args.submissionKey),
			)
			.unique();
		if (existingText) {
			if (existingText.sourceText !== args.sourceText) {
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
			return {
				textId: existingText._id,
				sentenceIds: existingSentences.map(({ _id }) => _id),
				deduplicated: true,
			};
		}

		const positions = new Set<number>();
		const sentenceKeys = new Set<string>();
		for (const sentence of args.sentences) {
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
				throw new Error(
					"Segments must reconstruct stitchedText exactly.",
				);
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
			submissionKey: args.submissionKey,
			sourceText: args.sourceText,
		});
		const sentenceIds: Id<"sentences">[] = [];
		for (const sentence of [...args.sentences].sort(
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
	},
});

export const getSentenceForResolution = internalQuery({
	args: { sentenceId: v.id("sentences") },
	returns: v.union(
		v.null(),
		v.object({
			sentenceId: v.id("sentences"),
			textId: v.id("texts"),
			segmentedSentenceId: v.string(),
			language: v.union(v.literal("de"), v.literal("he")),
			stitchedText: v.string(),
			segments: v.array(
				v.object({
					index: v.number(),
					kind: v.union(
						v.literal("ResolvableText"),
						v.literal("OpaqueText"),
						v.literal("Whitespace"),
						v.literal("Punctuation"),
					),
					text: v.string(),
				}),
			),
		}),
	),
	handler: async (ctx, { sentenceId }) => {
		const sentence = await ctx.db.get(sentenceId);
		if (!sentence) return null;
		const segments = await ctx.db
			.query("segments")
			.withIndex("by_sentence_id_and_index", (q) =>
				q.eq("sentenceId", sentenceId),
			)
			.take(MAX_SEGMENTS_PER_SENTENCE);
		return {
			sentenceId,
			textId: sentence.textId,
			segmentedSentenceId: sentence.segmentedSentenceId,
			language: sentence.language,
			stitchedText: sentence.stitchedText,
			segments: segments.map(({ index, kind, text }) => ({
				index,
				kind,
				text,
			})),
		};
	},
});

export const findOrPromoteResolvedContextForSegment = internalMutation({
	args: {
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
	},
	returns: v.union(
		v.null(),
		v.object({
			resolvedContextId: v.id("resolvedContexts"),
			grammatical: v.any(),
			reading: v.any(),
		}),
	),
	handler: async (ctx, { sentenceId, clickedSegmentIndex }) => {
		assertIndex(clickedSegmentIndex, "clickedSegmentIndex");
		let context = await ctx.db
			.query("resolvedContexts")
			.withIndex("by_sentence_id_and_clicked_segment_index", (q) =>
				q
					.eq("sentenceId", sentenceId)
					.eq("clickedSegmentIndex", clickedSegmentIndex),
			)
			.unique();
		if (!context) {
			const legacy = await ctx.db
				.query("visitorResolvedContexts")
				.withIndex("by_sentence_id_and_clicked_segment_index", (q) =>
					q
						.eq("sentenceId", sentenceId)
						.eq("clickedSegmentIndex", clickedSegmentIndex),
				)
				.first();
			if (!legacy?.resolutionId || !legacy.readingId) return null;
			const sentence = await ctx.db.get(sentenceId);
			if (!sentence) return null;
			const contextKey = resolvedContextKeyFor(
				sentence.segmentedSentenceId,
				clickedSegmentIndex,
			);
			const resolvedContextId = await ctx.db.insert("resolvedContexts", {
				contextKey,
				sentenceId,
				clickedSegmentIndex,
				resolutionId: legacy.resolutionId,
				readingId: legacy.readingId,
				resolvedAt: legacy.resolvedAt,
			});
			context = await ctx.db.get(resolvedContextId);
		}
		if (!context) return null;
		const [sentence, resolution, reading] = await Promise.all([
			ctx.db.get(context.sentenceId),
			ctx.db.get(context.resolutionId),
			ctx.db.get(context.readingId),
		]);
		if (!sentence || !resolution || !reading) return null;
		return {
			resolvedContextId: context._id,
			grammatical: {
				decision: "Resolved" as const,
				language: resolution.language,
				markedContext: resolution.markedContext,
				attestation: resolution.attestation,
				interaction: {
					segmentedSentenceId: sentence.segmentedSentenceId,
					clickedSegmentIndex,
					memberSegmentIndices: [...resolution.memberSegmentIndices],
				},
			},
			reading: reading.entry.reading,
		};
	},
});

export const findClickResultByRequestId = internalQuery({
	args: { requestId: v.string() },
	returns: v.union(
		v.null(),
		v.object({
			clickId: v.id("visitorClicks"),
			status: v.union(v.literal("Unresolved"), v.literal("Resolved")),
			resolvedContextId: v.optional(v.id("resolvedContexts")),
			resolutionId: v.optional(v.id("grammaticalResolutions")),
			readingId: v.optional(v.id("readings")),
		}),
	),
	handler: async (ctx, { requestId }) => {
		const click = await ctx.db
			.query("visitorClicks")
			.withIndex("by_request_id", (q) => q.eq("requestId", requestId))
			.unique();
		if (!click) return null;
		const context = await ctx.db
			.query("visitorResolvedContexts")
			.withIndex("by_click_id", (q) => q.eq("clickId", click._id))
			.unique();
		const resolvedContextId =
			click.resolvedContextId ?? context?.resolvedContextId;
		const resolvedContext = resolvedContextId
			? await ctx.db.get(resolvedContextId)
			: null;
		if (resolvedContext) {
			return {
				clickId: click._id,
				status: "Resolved" as const,
				resolvedContextId: resolvedContext._id,
				resolutionId: resolvedContext.resolutionId,
				readingId: resolvedContext.readingId,
			};
		}
		return context?.resolutionId && context.readingId
			? {
					clickId: click._id,
					status: "Resolved" as const,
					resolutionId: context.resolutionId,
					readingId: context.readingId,
				}
			: { clickId: click._id, status: "Unresolved" as const };
	},
});

export const persistUnresolvedClick = internalMutation({
	args: {
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
	},
	returns: v.object({
		clickId: v.id("visitorClicks"),
		deduplicated: v.boolean(),
	}),
	handler: async (ctx, args) => {
		assertVisitorInput(args.visitorId, args.requestId);
		await requireClickableSegment(
			ctx,
			args.sentenceId,
			args.clickedSegmentIndex,
		);
		const existing = await findClickByRequestId(ctx, args.requestId);
		if (existing) {
			assertMatchingRetry(existing, args);
			return { clickId: existing._id, deduplicated: true };
		}
		const clickId = await ctx.db.insert("visitorClicks", {
			...args,
			clickedAt: Date.now(),
		});
		return { clickId, deduplicated: false };
	},
});

export const persistReusedResolvedClick = internalMutation({
	args: {
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
		resolvedContextId: v.id("resolvedContexts"),
	},
	returns: v.object({
		clickId: v.id("visitorClicks"),
		resolutionId: v.id("grammaticalResolutions"),
		readingId: v.id("readings"),
		resolvedContextId: v.id("resolvedContexts"),
		contextId: v.id("visitorResolvedContexts"),
		deduplicated: v.boolean(),
	}),
	handler: async (ctx, args) => {
		const resolvedContext = await ctx.db.get(args.resolvedContextId);
		if (!resolvedContext) {
			throw new Error("Resolved Segment Context does not exist.");
		}
		return recordResolvedVisitorClick(ctx, args, resolvedContext);
	},
});

export const persistResolvedClick = internalMutation({
	args: {
		requestId: v.string(),
		visitorId: v.string(),
		sentenceId: v.id("sentences"),
		clickedSegmentIndex: v.number(),
		resolution: grammaticalResolutionInputValidator,
		readingKey: v.string(),
	},
	returns: v.object({
		clickId: v.id("visitorClicks"),
		resolutionId: v.id("grammaticalResolutions"),
		readingId: v.id("readings"),
		resolvedContextId: v.id("resolvedContexts"),
		contextId: v.id("visitorResolvedContexts"),
		deduplicated: v.boolean(),
	}),
	handler: async (ctx, args) => {
		assertVisitorInput(args.visitorId, args.requestId);
		assertNonEmpty(args.readingKey, "readingKey");
		const { sentence } = await requireClickableSegment(
			ctx,
			args.sentenceId,
			args.clickedSegmentIndex,
		);

		const memberIndices = args.resolution.memberSegmentIndices;
		if (memberIndices.length === 0) {
			throw new Error(
				"A grammatical resolution needs at least one member Segment.",
			);
		}
		let previous = -1;
		for (const index of memberIndices) {
			assertIndex(index, "memberSegmentIndex");
			if (index <= previous) {
				throw new Error(
					"Resolution member Segment indices must be ordered and unique.",
				);
			}
			const member = await ctx.db
				.query("segments")
				.withIndex("by_sentence_id_and_index", (q) =>
					q.eq("sentenceId", args.sentenceId).eq("index", index),
				)
				.unique();
			if (member?.kind !== "ResolvableText") {
				throw new Error(
					"Resolution members must refer to ResolvableText Segments.",
				);
			}
			previous = index;
		}
		if (!memberIndices.includes(args.clickedSegmentIndex)) {
			throw new Error(
				"The grammatical resolution must contain the clicked Segment.",
			);
		}
		const expectedResolutionKey = resolutionKeyFor(
			sentence.segmentedSentenceId,
			memberIndices,
		);
		if (args.resolution.resolutionKey !== expectedResolutionKey) {
			throw new Error(
				"resolutionKey does not match the Segmented Sentence and members.",
			);
		}

		const reading = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", args.readingKey),
			)
			.unique();
		if (!reading)
			throw new Error("Reading must be committed through Dumdict first.");
		if (reading.lemmaKey !== args.resolution.lemmaKey) {
			throw new Error(
				"Reading and grammatical resolution must own the same Lemma.",
			);
		}

		const existingResolution = await ctx.db
			.query("grammaticalResolutions")
			.withIndex("by_resolution_key", (q) =>
				q.eq("resolutionKey", args.resolution.resolutionKey),
			)
			.unique();
		let resolutionId: Id<"grammaticalResolutions">;
		if (existingResolution) {
			if (
				existingResolution.sentenceId !== args.sentenceId ||
				existingResolution.surfaceKey !== args.resolution.surfaceKey ||
				existingResolution.lemmaKey !== args.resolution.lemmaKey ||
				JSON.stringify(existingResolution.memberSegmentIndices) !==
					JSON.stringify(memberIndices)
			) {
				throw new Error(
					"resolutionKey collides with different grammatical data.",
				);
			}
			resolutionId = existingResolution._id;
		} else {
			resolutionId = await ctx.db.insert("grammaticalResolutions", {
				...args.resolution,
				sentenceId: args.sentenceId,
			});
		}

		const contextKey = resolvedContextKeyFor(
			sentence.segmentedSentenceId,
			args.clickedSegmentIndex,
		);
		const existingContext = await ctx.db
			.query("resolvedContexts")
			.withIndex("by_context_key", (q) => q.eq("contextKey", contextKey))
			.unique();
		let resolvedContext: Doc<"resolvedContexts">;
		if (existingContext) {
			if (
				existingContext.sentenceId !== args.sentenceId ||
				existingContext.clickedSegmentIndex !==
					args.clickedSegmentIndex ||
				existingContext.resolutionId !== resolutionId ||
				existingContext.readingId !== reading._id
			) {
				throw new Error(
					"Resolved Segment Context key collides with a different resolution.",
				);
			}
			resolvedContext = existingContext;
		} else {
			const resolvedContextId = await ctx.db.insert("resolvedContexts", {
				contextKey,
				sentenceId: args.sentenceId,
				clickedSegmentIndex: args.clickedSegmentIndex,
				resolutionId,
				readingId: reading._id,
				resolvedAt: Date.now(),
			});
			const inserted = await ctx.db.get(resolvedContextId);
			if (!inserted) {
				throw new Error(
					"Resolved Segment Context could not be persisted.",
				);
			}
			resolvedContext = inserted;
		}
		return recordResolvedVisitorClick(ctx, args, resolvedContext);
	},
});

export const getKnowledgeOwner = internalQuery({
	args: {
		ownerKind: knowledgeOwnerKindValidator,
		ownerKey: v.string(),
	},
	returns: v.union(
		v.null(),
		v.object({
			owner: v.any(),
			knowledge: v.optional(v.any()),
		}),
	),
	handler: async (ctx, args) => {
		const accumulated = await ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_kind_and_owner_key", (q) =>
				q.eq("ownerKind", args.ownerKind).eq("ownerKey", args.ownerKey),
			)
			.unique();
		if (args.ownerKind === "Lemma") {
			const lemma = await ctx.db
				.query("dictionaryLemmas")
				.withIndex("by_lemma_key", (q) =>
					q.eq("lemmaKey", args.ownerKey),
				)
				.unique();
			return lemma
				? {
						owner: lemma.record.lemma,
						...(accumulated
							? { knowledge: accumulated.knowledge }
							: {}),
					}
				: null;
		}
		const reading = await ctx.db
			.query("readings")
			.withIndex("by_reading_key", (q) =>
				q.eq("readingKey", args.ownerKey),
			)
			.unique();
		return reading
			? {
					owner: reading.entry.reading,
					...(accumulated
						? { knowledge: accumulated.knowledge }
						: {}),
				}
			: null;
	},
});

export const persistKnowledgeContribution = internalMutation({
	args: {
		contributionKey: v.string(),
		ownerKind: knowledgeOwnerKindValidator,
		ownerKey: v.string(),
		change: v.any(),
		knowledge: v.any(),
	},
	returns: v.object({
		contributionId: v.id("knowledgeContributions"),
		accumulatedKnowledgeId: v.id("accumulatedKnowledge"),
		deduplicated: v.boolean(),
	}),
	handler: async (ctx, args) => {
		assertNonEmpty(args.contributionKey, "contributionKey");
		assertNonEmpty(args.ownerKey, "ownerKey");
		const existingContribution = await ctx.db
			.query("knowledgeContributions")
			.withIndex("by_contribution_key", (q) =>
				q.eq("contributionKey", args.contributionKey),
			)
			.unique();
		const existingAccumulated = await ctx.db
			.query("accumulatedKnowledge")
			.withIndex("by_owner_kind_and_owner_key", (q) =>
				q.eq("ownerKind", args.ownerKind).eq("ownerKey", args.ownerKey),
			)
			.unique();
		if (existingContribution) {
			if (
				existingContribution.ownerKind !== args.ownerKind ||
				existingContribution.ownerKey !== args.ownerKey ||
				!existingAccumulated
			) {
				throw new Error(
					"contributionKey collides with a different contribution.",
				);
			}
			return {
				contributionId: existingContribution._id,
				accumulatedKnowledgeId: existingAccumulated._id,
				deduplicated: true,
			};
		}

		if (args.ownerKind === "Lemma") {
			const lemma = await ctx.db
				.query("dictionaryLemmas")
				.withIndex("by_lemma_key", (q) =>
					q.eq("lemmaKey", args.ownerKey),
				)
				.unique();
			if (!lemma)
				throw new Error("Knowledge owner Lemma does not exist.");
			await ctx.db.patch(lemma._id, {
				record: { ...lemma.record, knowledge: args.knowledge },
			});
		} else {
			const reading = await ctx.db
				.query("readings")
				.withIndex("by_reading_key", (q) =>
					q.eq("readingKey", args.ownerKey),
				)
				.unique();
			if (!reading)
				throw new Error("Knowledge owner Reading does not exist.");
			await ctx.db.patch(reading._id, {
				entry: { ...reading.entry, knowledge: args.knowledge },
			});
		}
		const now = Date.now();
		let accumulatedKnowledgeId: Id<"accumulatedKnowledge">;
		if (existingAccumulated) {
			await ctx.db.patch(existingAccumulated._id, {
				knowledge: args.knowledge,
				updatedAt: now,
			});
			accumulatedKnowledgeId = existingAccumulated._id;
		} else {
			accumulatedKnowledgeId = await ctx.db.insert(
				"accumulatedKnowledge",
				{
					ownerKind: args.ownerKind,
					ownerKey: args.ownerKey,
					knowledge: args.knowledge,
					updatedAt: now,
				},
			);
		}
		const contributionId = await ctx.db.insert("knowledgeContributions", {
			contributionKey: args.contributionKey,
			ownerKind: args.ownerKind,
			ownerKey: args.ownerKey,
			change: args.change,
			createdAt: now,
		});
		return { contributionId, accumulatedKnowledgeId, deduplicated: false };
	},
});
