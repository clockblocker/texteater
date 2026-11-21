import { v } from "convex/values";
import { assertIdentifier } from "../server/identifiers";
import { inspectionJson } from "../server/inspectionPayload";
import {
	CONTEXT_MAX_SENTENCES,
	type ExplainedSentence,
	explanationRequest,
} from "../server/pronounExplanation";
import {
	isAntecedentCandidate,
	isPronounUnit,
	unitKey,
} from "../shared/pronoun-explanation";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { inspectionEnabled } from "./deploymentFlags";
import { loadStoredSegments } from "./model/storedSegments";
import { antecedentValidator } from "./model/tables/explanations";
import { consumeRateLimit } from "./rateLimits";
import { saveInspectionStep } from "./resolutionInspection";
import { readableScroll } from "./scrollViews";

/*
 * Pronoun Explanations: what a pronoun refers to, asked once per pronoun
 * unit of a Sentence and stored for every Visitor. The row is the
 * in-flight marker, so concurrent clicks start one model call; a Pending
 * row whose run died is asked again by the next click.
 */

/** A Pending explanation this old has lost its run; the next click asks again. */
export const STALE_PENDING_MS = 2 * 60_000;

/** The most explanations a Scroll's reader loads at once. */
const MAX_EXPLANATIONS_PER_SCROLL = 2_000;

const explanationViewValidator = v.object({
	sentenceId: v.id("sentences"),
	pronoun: v.array(v.number()),
	state: v.union(
		v.literal("Pending"),
		v.literal("Resolved"),
		v.literal("Failed"),
	),
	/** What it refers to, once Resolved; none for an expletive `es`. */
	antecedents: v.array(antecedentValidator),
});

/** Every explanation asked in a Scroll, for the reader to show at once. */
export const forScroll = query({
	args: { scrollId: v.string(), visitorId: v.string() },
	returns: v.array(explanationViewValidator),
	handler: async (ctx, { scrollId, visitorId }) => {
		const scroll = await readableScroll(ctx, scrollId, visitorId);
		if (!scroll) return [];
		const rows = await ctx.db
			.query("pronounExplanations")
			.withIndex("by_scroll_id", (q) => q.eq("scrollId", scroll._id))
			.take(MAX_EXPLANATIONS_PER_SCROLL);
		return rows.map(({ sentenceId, pronoun, state }) => ({
			sentenceId,
			pronoun,
			state: state.kind,
			antecedents: state.kind === "Resolved" ? state.antecedents : [],
		}));
	},
});

const rejected = (message: string) => ({
	kind: "Rejected" as const,
	message,
});

/**
 * Asks what one pronoun refers to, unless it is answered or being asked:
 * a new or failed explanation, or one whose run died, starts a run. Only a
 * unit intake routed as a pronoun (PRON) is explained.
 */
export const request = mutation({
	args: {
		visitorId: v.string(),
		sentenceId: v.string(),
		pronoun: v.array(v.number()),
		requestId: v.optional(v.string()),
		inspect: v.optional(v.boolean()),
	},
	returns: v.union(
		v.object({ kind: v.literal("Asked") }),
		v.object({ kind: v.literal("Rejected"), message: v.string() }),
	),
	handler: async (
		ctx,
		{ visitorId, sentenceId: value, pronoun, requestId, inspect },
	) => {
		assertIdentifier(visitorId, "visitorId");
		if (requestId !== undefined) assertIdentifier(requestId, "requestId");
		const sentenceId = ctx.db.normalizeId("sentences", value);
		const sentence = sentenceId ? await ctx.db.get(sentenceId) : null;
		if (
			!sentence ||
			!(await readableScroll(ctx, sentence.scrollId, visitorId))
		)
			return rejected("This sentence is no longer available.");
		const key = unitKey(pronoun);
		const unit = sentence.units?.find(
			({ segments }) => unitKey(segments) === key,
		);
		if (!unit || !isPronounUnit(unit))
			return rejected("Only a pronoun can be explained.");
		const existing = await ctx.db
			.query("pronounExplanations")
			.withIndex("by_sentence_id_and_pronoun_key", (q) =>
				q.eq("sentenceId", sentence._id).eq("pronounKey", key),
			)
			.unique();
		const now = Date.now();
		const { state } = existing ?? {};
		if (
			state?.kind === "Resolved" ||
			(state?.kind === "Pending" &&
				now - state.startedAt < STALE_PENDING_MS)
		)
			return { kind: "Asked" as const };
		const limit = await consumeRateLimit(
			ctx,
			"pronounExplanation",
			visitorId,
		);
		if (!limit.ok) return rejected(limit.message);
		const run = (state ? state.run : 0) + 1;
		const pending = { kind: "Pending" as const, run, startedAt: now };
		const explanationId = existing
			? existing._id
			: await ctx.db.insert("pronounExplanations", {
					scrollId: sentence.scrollId,
					sentenceId: sentence._id,
					pronounKey: key,
					pronoun: [...unit.segments],
					state: pending,
				});
		if (existing) await ctx.db.patch(existing._id, { state: pending });
		const inspectRequestId =
			inspect === true && inspectionEnabled()
				? (requestId ?? crypto.randomUUID())
				: undefined;
		if (inspectRequestId !== undefined) {
			const stored = await loadStoredSegments(ctx, sentence._id);
			const byIndex = new Map(
				stored.map((segment) => [segment.index, segment.text]),
			);
			const selectedSegment = unit.segments
				.map((index) => byIndex.get(index) ?? "")
				.filter((text) => text.length > 0)
				.join(" ");
			await ctx.db.insert("inspectionClicks", {
				requestId: inspectRequestId,
				visitorId,
				sentenceId: sentence._id,
				selectedSegment: selectedSegment || "Pronoun",
				sentence: sentence.stitchedText,
				startedAt: now,
				selectionKind: "PronounExplanation",
				resolutionState: "Running",
			});
			await saveInspectionStep(ctx, inspectRequestId, {
				id: `${inspectRequestId}:selection`,
				name: "Explain pronoun · schedule run",
				kind: "Code",
				owner: "app/tf-demo · pronounExplanations.request",
				startedAt: now,
				durationMs: 0,
				timing: "Unmeasured",
				status: "Success",
				payloadJson: inspectionJson({
					input: { visitorId, sentenceId: sentence._id, pronoun },
					output: { explanationId, run },
					timing: "Convex mutation clock is transaction-frozen; duration is not measured.",
				}),
			});
		}
		await ctx.scheduler.runAfter(
			0,
			internal.pronounExplanationActions.explain,
			{
				explanationId,
				run,
				...(inspectRequestId === undefined ? {} : { inspectRequestId }),
			},
		);
		return { kind: "Asked" as const };
	},
});

/** The run's explanation while it is still the run's to settle, else null. */
async function pendingRun(
	ctx: QueryCtx,
	explanationId: Doc<"pronounExplanations">["_id"],
	run: number,
) {
	const explanation = await ctx.db.get(explanationId);
	return explanation?.state.kind === "Pending" &&
		explanation.state.run === run
		? explanation
		: null;
}

async function explainedSentence(
	ctx: QueryCtx,
	sentence: Doc<"sentences">,
): Promise<ExplainedSentence> {
	return {
		sentenceId: sentence._id,
		stitchedText: sentence.stitchedText,
		segments: (await loadStoredSegments(ctx, sentence._id)).map(
			({ index, kind, text }) => ({ index, kind, text }),
		),
		...(sentence.units ? { units: sentence.units } : {}),
	};
}

const passageSentenceValidator = v.object({
	segments: v.array(v.object({ index: v.number(), text: v.string() })),
	candidates: v.array(v.array(v.number())),
	cut: v.optional(v.literal(true)),
});

/**
 * What the run asks `explain.pronoun`: the pronoun's Sentence after its
 * context (`explanationRequest`), and each passage Sentence's id. Null
 * once the run is no longer the explanation's.
 */
export const loadRequest = internalQuery({
	args: { explanationId: v.id("pronounExplanations"), run: v.number() },
	returns: v.union(
		v.null(),
		v.object({
			input: v.object({
				language: v.literal("de"),
				passage: v.array(passageSentenceValidator),
				pronoun: v.array(v.number()),
			}),
			sentenceIds: v.array(v.id("sentences")),
		}),
	),
	handler: async (ctx, { explanationId, run }) => {
		const explanation = await pendingRun(ctx, explanationId, run);
		const sentence = explanation
			? await ctx.db.get(explanation.sentenceId)
			: null;
		if (!explanation || !sentence) return null;
		const preceding = await ctx.db
			.query("sentences")
			.withIndex("by_scroll_id_and_position", (q) =>
				q
					.eq("scrollId", sentence.scrollId)
					.lt("position", sentence.position),
			)
			.order("desc")
			.take(CONTEXT_MAX_SENTENCES);
		const { input, sentenceIds } = explanationRequest({
			sentence: await explainedSentence(ctx, sentence),
			pronoun: explanation.pronoun,
			preceding: await Promise.all(
				preceding.map((other) => explainedSentence(ctx, other)),
			),
		});
		return {
			input: {
				...input,
				passage: input.passage.map((part) => ({
					...part,
					segments: part.segments.map((segment) => ({ ...segment })),
					candidates: part.candidates.map((members) => [...members]),
				})),
				pronoun: [...input.pronoun],
			},
			sentenceIds: sentenceIds.map((id) => id as Doc<"sentences">["_id"]),
		};
	},
});

/**
 * Settles the run's explanation: its Antecedents, each kept only while its
 * Sentence, in the same Scroll, still has that noun unit; or its failure.
 * A run that is no longer the explanation's changes nothing.
 */
export const settle = internalMutation({
	args: {
		explanationId: v.id("pronounExplanations"),
		run: v.number(),
		outcome: v.union(
			v.object({
				kind: v.literal("Resolved"),
				antecedents: v.array(antecedentValidator),
			}),
			v.object({ kind: v.literal("Failed"), message: v.string() }),
		),
		inspectRequestId: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, { explanationId, run, outcome, inspectRequestId }) => {
		const explanation = await pendingRun(ctx, explanationId, run);
		if (!explanation) return null;
		const finishInspection = async (
			state: "Complete" | "PermanentFailure",
		) => {
			if (inspectRequestId === undefined) return;
			const click = await ctx.db
				.query("inspectionClicks")
				.withIndex("by_request_id", (q) =>
					q.eq("requestId", inspectRequestId),
				)
				.unique();
			if (click?.selectionKind === "PronounExplanation") {
				await ctx.db.patch(click._id, {
					resolutionState: state,
					finishedAt: Date.now(),
				});
			}
		};
		if (outcome.kind === "Failed") {
			await ctx.db.patch(explanationId, {
				state: { kind: "Failed", run, message: outcome.message },
			});
			await finishInspection("PermanentFailure");
			return null;
		}
		const antecedents = [];
		for (const antecedent of outcome.antecedents) {
			const sentence = await ctx.db.get(antecedent.sentenceId);
			const key = unitKey(antecedent.segments);
			const unit = sentence?.units?.find(
				({ segments }) => unitKey(segments) === key,
			);
			if (
				sentence?.scrollId === explanation.scrollId &&
				unit &&
				isAntecedentCandidate(unit)
			)
				antecedents.push({
					sentenceId: sentence._id,
					segments: [...unit.segments],
				});
		}
		await ctx.db.patch(explanationId, {
			state: { kind: "Resolved", antecedents },
		});
		await finishInspection("Complete");
		return null;
	},
});
