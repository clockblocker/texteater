"use node";

import { messageOf } from "common-utils";
import { v } from "convex/values";
import {
	type BatchLine,
	type BatchRequest,
	type LunaBatch,
	type LunaBodyAsk,
	type LunaRequestAhead,
	lunaRequestAhead,
	lunaRequestKey,
	lunaTokens,
} from "dumgen";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import { clickGrammarInputOf } from "../server/clickGrammarInput";
import { dumgenGrammarInput } from "../server/dumgenClickResolution";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalAction } from "./_generated/server";
import { parsedResolutionContext } from "./model/clickOrchestrator";
import { ConvexActionCtx, runConvexEffect } from "./model/convexEffect";
import { modelTransports } from "./model/deploymentDumgen";

/*
 * The Luna requests asked ahead of the clicks (#1351): once Intake has
 * processed a Folio, or a paste or link whole, `submit` builds the Luna
 * request a click on each unit there would send before jev answers (the
 * `canonical` guess, or the `emojiDescription` draft of a headword code
 * writes), from the Resolution Context the click would load. Those of the
 * first stretch a reader sees (`FIRST_STRETCH_CHARACTERS`) not answered
 * before are asked live at once, in reading order, each answer stored as
 * it comes; the rest not answered before go as one OpenAI batch, which
 * `poll` looks at on Convex's scheduler until it ends, storing a completed
 * batch's answers. Each request is asked once, live or batched, and its
 * answer stored by request key, where the click's Luna transport finds it.
 * Nothing waits on either: a click whose answer is not stored yet asks
 * Luna itself. A deployment without an OpenAI key skips both.
 */

/** Contexts loaded at once while the requests are built. */
const CONTEXT_CONCURRENCY = 8;
/**
 * Requests of the first stretch asked live at once: at about a second
 * each, the first Sentence's are stored within a few seconds, and a
 * screenful's (some 150 requests) within half a minute.
 */
const LIVE_CONCURRENCY = 8;
/**
 * The most requests one batch file holds: about 8 KB a line, so a file
 * stays near 16 MB, well inside OpenAI's 200 MB and the action's memory. A
 * Folio or a paste fits in one; only a very long link is sent as several.
 */
const MAX_BATCH_REQUESTS = 2_000;
/** Request keys checked for a stored answer per query. */
const KEY_CHECK_CHUNK = 200;
/** Answers stored per mutation: a body is a few KB. */
const ANSWER_CHUNK = 50;
/** Each OpenAI exchange's deadline. */
const OPENAI_DEADLINE_MS = 120_000;
/** The first poll, then each doubled up to the longest wait. */
const FIRST_POLL_AFTER_MS = 60_000;
const LONGEST_POLL_WAIT_MS = 10 * 60_000;
/** Past OpenAI's 24-hour window, a batch still running is given up. */
const GIVE_UP_AFTER_MS = 25 * 60 * 60_000;

/** The wait before the poll after `polls` looks. */
export const pollWaitMs = (polls: number) =>
	Math.min(FIRST_POLL_AFTER_MS * 2 ** polls, LONGEST_POLL_WAIT_MS);

const chunks = <T>(items: readonly T[], size: number): T[][] =>
	Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
		items.slice(index * size, (index + 1) * size),
	);

/** A request asked ahead, under its key, with its stage beside it. */
type StagedBatchRequest = BatchRequest & Pick<LunaRequestAhead, "stage">;

const unwrapError = (cause: Cause.Cause<unknown>) => {
	const squashed = Cause.squash(cause);
	return Cause.isUnknownError(squashed) ? squashed.cause : squashed;
};

/**
 * The Luna request a click on the Segment would send before jev answers,
 * built from the context the click would load, or none: a unit already
 * attested, one the authored identities resolve, one whose headword a
 * stored Lemma writes, one whose headword code writes where its Readings
 * may exist, one whose context cannot be read.
 */
const requestAheadFromContext = Effect.fn("LunaAhead.requestAheadFromContext")(
	function* (
		unit: { sentenceId: Id<"sentences">; clickedSegmentIndex: number },
		rawContext: Parameters<typeof parsedResolutionContext>[0],
	) {
		return yield* Effect.gen(function* () {
			const context = parsedResolutionContext(rawContext);
			if (context.reusable || !context.sentence) return undefined;
			const input = dumgenGrammarInput(
				clickGrammarInputOf(context, unit.clickedSegmentIndex),
			);
			const asked = input ? yield* lunaRequestAhead(input) : undefined;
			if (!asked) return undefined;
			const key = yield* Effect.tryPromise(() =>
				lunaRequestKey(asked.request),
			);
			return { customId: key, ...asked } as StagedBatchRequest;
		}).pipe(
			Effect.catchCause((cause) => {
				if (Cause.hasInterruptsOnly(cause)) return Effect.interrupt;
				console.warn(
					`Luna ahead batch: no request for Segment ${unit.clickedSegmentIndex} of ${unit.sentenceId}: ${messageOf(unwrapError(cause))}`,
				);
				return Effect.succeed<StagedBatchRequest | undefined>(
					undefined,
				);
			}),
		);
	},
);

/**
 * The requests the units send, in the units' order, each once: one that
 * several units send stands where the first sends it. `unitCount` counts
 * the units that send one. Contexts are fetched once per Sentence.
 */
const requestsOf = Effect.fn("LunaAhead.requestsOf")(function* (
	units: readonly {
		sentenceId: Id<"sentences">;
		clickedSegmentIndex: number;
	}[],
) {
	const actionCtx = yield* ConvexActionCtx;
	const built: (StagedBatchRequest | undefined)[] = [];
	const bySentence = new Map<
		Id<"sentences">,
		{ readonly index: number; readonly clickedSegmentIndex: number }[]
	>();
	for (const [index, unit] of units.entries()) {
		const slots = bySentence.get(unit.sentenceId) ?? [];
		slots.push({ index, clickedSegmentIndex: unit.clickedSegmentIndex });
		bySentence.set(unit.sentenceId, slots);
	}
	yield* Effect.forEach(
		[...bySentence.entries()],
		([sentenceId, slots]) =>
			actionCtx
				.runQuery(internal.lunaAheadBatches.sentenceUnitContexts, {
					sentenceId,
					clickedSegmentIndices: slots.map(
						({ clickedSegmentIndex }) => clickedSegmentIndex,
					),
				})
				.pipe(
					Effect.flatMap((loaded) =>
						Effect.forEach(
							slots,
							({ index, clickedSegmentIndex }, slotAt) => {
								const item = loaded[slotAt];
								if (
									!item ||
									!("context" in item) ||
									!item.context
								) {
									console.warn(
										`Luna ahead batch: no request for Segment ${clickedSegmentIndex} of ${sentenceId}: ${item && "error" in item ? item.error : "Missing context"}`,
									);
									return Effect.void;
								}
								return requestAheadFromContext(
									{ sentenceId, clickedSegmentIndex },
									item.context,
								).pipe(
									Effect.tap((request) =>
										Effect.sync(() => {
											built[index] = request;
										}),
									),
									Effect.asVoid,
								);
							},
							{ concurrency: "unbounded", discard: true },
						),
					),
					Effect.catchCause((cause) => {
						if (Cause.hasInterruptsOnly(cause))
							return Effect.interrupt;
						const reason = messageOf(unwrapError(cause));
						for (const { clickedSegmentIndex } of slots) {
							console.warn(
								`Luna ahead batch: no request for Segment ${clickedSegmentIndex} of ${sentenceId}: ${reason}`,
							);
						}
						return Effect.void;
					}),
				),
		{ concurrency: CONTEXT_CONCURRENCY, discard: true },
	);
	const requests = new Map<string, StagedBatchRequest>();
	let unitCount = 0;
	for (const request of built) {
		if (!request) continue;
		unitCount++;
		if (!requests.has(request.customId))
			requests.set(request.customId, request);
	}
	return { requests: [...requests.values()], unitCount };
});

/** The requests counted by their Luna stage. */
function stageCountsOf(requests: readonly StagedBatchRequest[]) {
	const counts: Record<string, number> = {};
	for (const { stage } of requests) counts[stage] = (counts[stage] ?? 0) + 1;
	return counts;
}

const describedStages = (counts: Record<string, number>) =>
	Object.entries(counts)
		.map(([stage, count]) => `${count} ${stage}`)
		.join(", ");

/** The requests of `requests` with no stored answer yet. */
const unanswered = Effect.fn("LunaAhead.unanswered")(function* (
	requests: readonly StagedBatchRequest[],
) {
	const actionCtx = yield* ConvexActionCtx;
	const answered = new Set<string>();
	for (const keys of chunks(
		requests.map(({ customId }) => customId),
		KEY_CHECK_CHUNK,
	)) {
		const found = yield* actionCtx.runQuery(
			internal.lunaAheadBatches.answeredKeys,
			{ requestKeys: keys },
		);
		for (const key of found) answered.add(key);
	}
	return requests.filter(({ customId }) => !answered.has(customId));
});

type Submission = { scrollId: Id<"scrolls">; folioId?: Id<"folios"> };

/**
 * Asks the first stretch's requests live, `LIVE_CONCURRENCY` at a time in
 * reading order, through the exchange the click's Luna transport makes,
 * and stores each answer as it comes. A request that fails is left to its
 * click; the row records what came of them all.
 */
const askLive = Effect.fn("LunaAhead.askLive")(function* (
	submission: Submission,
	requests: readonly StagedBatchRequest[],
	unitCount: number,
	ask: LunaBodyAsk,
) {
	const actionCtx = yield* ConvexActionCtx;
	const stageCounts = stageCountsOf(requests);
	const batchId = yield* actionCtx.runMutation(
		internal.lunaAheadBatches.recordAskedLive,
		{
			...submission,
			unitCount,
			requestCount: requests.length,
			stageCounts,
		},
	);
	console.log(
		`Luna ahead: asking ${requests.length} requests (${describedStages(stageCounts)}) of the first stretch live for ${unitCount} units`,
	);
	const bodies: string[] = [];
	yield* Effect.forEach(
		requests,
		({ customId, request, maxOutputTokens }) =>
			Effect.tryPromise(() =>
				ask(request, {
					signal: AbortSignal.timeout(OPENAI_DEADLINE_MS),
					...(maxOutputTokens === undefined
						? {}
						: { maxOutputTokens }),
				}),
			).pipe(
				Effect.flatMap((body) =>
					actionCtx
						.runMutation(internal.lunaAheadBatches.storeAnswers, {
							batchId,
							answers: [{ requestKey: customId, body }],
						})
						.pipe(
							Effect.tap(() =>
								Effect.sync(() => {
									bodies.push(body);
								}),
							),
						),
				),
				Effect.catchCause((cause) => {
					if (Cause.hasInterruptsOnly(cause)) return Effect.interrupt;
					console.warn(
						`Luna ahead: a live request of ${batchId} failed: ${messageOf(unwrapError(cause))}`,
					);
					return Effect.void;
				}),
			),
		{ concurrency: LIVE_CONCURRENCY, discard: true },
	);
	yield* actionCtx.runMutation(internal.lunaAheadBatches.recordSettled, {
		batchId,
		state: "Completed",
		answerCount: bodies.length,
		failedCount: requests.length - bodies.length,
		tokens: tokensOfBodies(bodies),
	});
});

/** Sends the requests as OpenAI batches, recording each and scheduling its polls. */
const submitBatches = Effect.fn("LunaAhead.submitBatches")(function* (
	submission: Submission,
	requests: readonly StagedBatchRequest[],
	unitCount: number,
	batch: LunaBatch,
) {
	const actionCtx = yield* ConvexActionCtx;
	const parts = chunks(requests, MAX_BATCH_REQUESTS);
	for (const part of parts) {
		const { id } = yield* Effect.tryPromise(() =>
			batch.submit(
				part.map(({ stage: _stage, ...request }) => request),
				AbortSignal.timeout(OPENAI_DEADLINE_MS),
			),
		);
		const stageCounts = stageCountsOf(part);
		yield* actionCtx.runMutation(
			internal.lunaAheadBatches.recordSubmitted,
			{
				...submission,
				openAIBatchId: id,
				// A batch sent in parts counts its units on the first.
				unitCount: part === parts[0] ? unitCount : 0,
				requestCount: part.length,
				stageCounts,
				firstPollAfterMs: pollWaitMs(0),
			},
		);
		console.log(
			`Luna ahead batch: submitted ${id}, ${part.length} requests (${describedStages(stageCounts)}) for ${unitCount} units`,
		);
	}
});

const submitAhead = Effect.fn("LunaAhead.submit")(function* (args: Submission) {
	const { lunaBody, lunaBatch } = modelTransports();
	// Without an OpenAI key there is no Luna to ask ahead.
	if (!lunaBody && !lunaBatch) return;
	const actionCtx = yield* ConvexActionCtx;
	const units = yield* actionCtx.runQuery(
		internal.lunaAheadBatches.unitsAhead,
		args,
	);
	// Where nothing is asked live, the first stretch is batched too.
	const stretch = yield* requestsOf(lunaBody ? units.firstStretch : []);
	const live = yield* unanswered(stretch.requests);
	// Nothing waits on the live requests: the rest is built and
	// batched while they are asked.
	const liveFiber =
		lunaBody && live.length > 0
			? yield* Effect.forkChild(
					askLive(
						args,
						live,
						stretch.unitCount,
						lunaBody({ promptCaching: true }),
					).pipe(
						Effect.catchCause((cause) => {
							if (Cause.hasInterruptsOnly(cause))
								return Effect.interrupt;
							console.warn(
								`Luna ahead: asking ${args.folioId ?? args.scrollId}'s first stretch live failed: ${messageOf(unwrapError(cause))}`,
							);
							return Effect.void;
						}),
					),
				)
			: undefined;
	yield* Effect.gen(function* () {
		const rest = yield* requestsOf(
			lunaBody ? units.rest : [...units.firstStretch, ...units.rest],
		);
		// A request the first stretch sends too is asked there alone.
		const inStretch = new Set(
			stretch.requests.map(({ customId }) => customId),
		);
		const batched = yield* unanswered(
			rest.requests.filter(({ customId }) => !inStretch.has(customId)),
		);
		if (lunaBatch && batched.length > 0)
			yield* submitBatches(args, batched, rest.unitCount, lunaBatch());
		if (live.length === 0 && batched.length === 0)
			console.log(
				`Luna ahead batch: nothing to ask for ${args.folioId ?? args.scrollId} (${stretch.unitCount + rest.unitCount} units)`,
			);
	}).pipe(Effect.ensuring(liveFiber ? Fiber.join(liveFiber) : Effect.void));
});

export const submit = internalAction({
	args: {
		scrollId: v.id("scrolls"),
		folioId: v.optional(v.id("folios")),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await runConvexEffect(ctx, submitAhead(args));
		return null;
	},
});

/** The tokens a stored answer's body reports. */
function tokensOf(body: string) {
	try {
		const parsed: unknown = JSON.parse(body);
		const usage =
			parsed && typeof parsed === "object" && "usage" in parsed
				? parsed.usage
				: undefined;
		return lunaTokens({ usage });
	} catch {
		return lunaTokens(undefined);
	}
}

/** The tokens stored answers' bodies report together. */
function tokensOfBodies(bodies: readonly string[]) {
	const tokens = { input: 0, cachedInput: 0, output: 0 };
	for (const body of bodies) {
		const spent = tokensOf(body);
		tokens.input += spent.inputTokens;
		tokens.cachedInput += spent.cachedInputTokens;
		tokens.output += spent.outputTokens;
	}
	return tokens;
}

/** Stores a completed batch's usable lines and records what came of it. */
const storeCompleted = Effect.fn("LunaAhead.storeCompleted")(function* (
	batchId: Id<"lunaAheadBatches">,
	lines: readonly BatchLine[],
) {
	const actionCtx = yield* ConvexActionCtx;
	const answers = lines.flatMap((line) =>
		line.ok ? [{ requestKey: line.customId, body: line.body }] : [],
	);
	for (const part of chunks(answers, ANSWER_CHUNK))
		yield* actionCtx.runMutation(internal.lunaAheadBatches.storeAnswers, {
			batchId,
			answers: part,
		});
	yield* actionCtx.runMutation(internal.lunaAheadBatches.recordSettled, {
		batchId,
		state: "Completed",
		answerCount: answers.length,
		failedCount: lines.length - answers.length,
		tokens: tokensOfBodies(answers.map(({ body }) => body)),
	});
});

const endedStates = {
	failed: "Failed",
	expired: "Expired",
	cancelled: "Cancelled",
} as const;

const pollBatch = Effect.fn("LunaAhead.poll")(function* (
	batchId: Id<"lunaAheadBatches">,
) {
	const actionCtx = yield* ConvexActionCtx;
	const row = yield* actionCtx.runQuery(internal.lunaAheadBatches.batch, {
		batchId,
	});
	// Requests asked live have no OpenAI batch to look at.
	if (row?.state !== "Submitted" || row.openAIBatchId === undefined) return;
	const { openAIBatchId } = row;
	const lunaBatch = modelTransports().lunaBatch;
	const giveUp = (failure: string) => {
		console.warn(`Luna ahead batch: ${openAIBatchId} dropped: ${failure}`);
		return actionCtx.runMutation(internal.lunaAheadBatches.recordSettled, {
			batchId,
			state: "Expired",
			failure,
		});
	};
	if (!lunaBatch) {
		yield* giveUp("The deployment has no OpenAI key now");
		return;
	}
	const batch = lunaBatch();
	const signal = AbortSignal.timeout(OPENAI_DEADLINE_MS);
	const settled = yield* Effect.gen(function* () {
		const state = yield* Effect.tryPromise(() =>
			batch.check(openAIBatchId, signal),
		);
		if (state.final && state.status === "completed") {
			const lines = yield* Effect.tryPromise(() =>
				batch.lines(state, signal),
			);
			yield* storeCompleted(batchId, lines);
			console.log(`Luna ahead batch: ${openAIBatchId} completed`);
			return true;
		}
		if (state.final) {
			const failure = `OpenAI ended the batch ${state.status}${state.errors ? `: ${state.errors}` : ""}`;
			console.warn(
				`Luna ahead batch: ${openAIBatchId} dropped: ${failure}`,
			);
			yield* actionCtx.runMutation(
				internal.lunaAheadBatches.recordSettled,
				{
					batchId,
					state:
						state.status in endedStates
							? endedStates[
									state.status as keyof typeof endedStates
								]
							: "Failed",
					failure,
				},
			);
			return true;
		}
		return false;
	}).pipe(
		Effect.catchCause((cause) => {
			if (Cause.hasInterruptsOnly(cause)) return Effect.interrupt;
			console.warn(
				`Luna ahead batch: polling ${openAIBatchId} failed: ${messageOf(unwrapError(cause))}`,
			);
			return Effect.succeed(false);
		}),
	);
	if (settled) return;
	if (Date.now() - row.submittedAt > GIVE_UP_AFTER_MS) {
		yield* giveUp("No final status within 25 hours");
		return;
	}
	yield* actionCtx.runMutation(internal.lunaAheadBatches.recordPolled, {
		batchId,
		nextPollAfterMs: pollWaitMs(row.polls + 1),
	});
});

export const poll = internalAction({
	args: { batchId: v.id("lunaAheadBatches") },
	returns: v.null(),
	handler: async (ctx, { batchId }) => {
		await runConvexEffect(ctx, pollBatch(batchId));
		return null;
	},
});
