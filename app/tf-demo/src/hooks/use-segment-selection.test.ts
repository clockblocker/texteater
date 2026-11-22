import { describe, expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Fiber from "effect/Fiber";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import * as TestClock from "effect/testing/TestClock";
import {
	isCommandInterrupted,
	runCommandEffect,
	squashCommandFailure,
} from "@/lib/command-scheduler";
import type { WorkspaceCardTarget } from "@/workspace/workspace-controller";
import type { Id } from "../../convex/_generated/dataModel";
import {
	STORED_DEAL_WAIT_MS,
	scheduleSegmentSelection,
	segmentKey,
} from "./use-segment-selection";

const canonicalFor = (id: string) => ({
	readingId: `reading-${id}` as Id<"readings">,
	lemmaId: `lemma-${id}` as Id<"lemmas">,
	surfaceId: `surface-${id}` as Id<"surfaces">,
	surfaceLanguage: "de" as const,
	normalizedSurface: `word-${id}`,
	attestationId: `attestation-${id}` as Id<"attestations">,
	steps: { attestation: true, surface: true, lemma: true },
});

const availableFor = (id: string) =>
	({
		kind: "Available",
		canonical: canonicalFor(id),
	}) as const;

const resolvingFor = (requestId: string) =>
	({
		kind: "Resolving",
		requestId,
		progress: "Starting",
		activity: "Scheduled",
		deduplicated: false,
	}) as const;

const sentenceId = "sentence-1" as Id<"sentences">;

describe("scheduleSegmentSelection", () => {
	test("waits for stored-route prefetch when it completes within STORED_DEAL_WAIT_MS", async () => {
		await Effect.runPromise(
			Effect.gen(function* () {
				const registry = AtomRegistry.make();
				const prefetchStarted = Deferred.makeUnsafe<void>();
				let resolvePrefetch!: () => void;
				const presented: Array<{
					readonly selection: string;
					readonly cards: readonly WorkspaceCardTarget[];
				}> = [];

				const fiber = yield* Effect.forkDetach(
					scheduleSegmentSelection(
						registry,
						{
							visitorId: "visitor-1",
							sentenceId,
							clickedSegmentIndex: 2,
							anchorElement: { id: "anchor-2" },
						},
						{
							selectSegment: async () => availableFor("2"),
							prefetchNotes: () =>
								new Promise<void>((resolve) => {
									resolvePrefetch = resolve;
									Deferred.doneUnsafe(
										prefetchStarted,
										Exit.void,
									);
								}),
							presentCards: (cards, options) => {
								presented.push({
									selection: options.selection,
									cards,
								});
							},
							createRequestId: () => "req-2",
							inspect: false,
						},
					),
					{ startImmediately: true },
				);

				yield* Deferred.await(prefetchStarted);
				yield* TestClock.adjust(STORED_DEAL_WAIT_MS / 2);
				expect(presented).toHaveLength(0);

				resolvePrefetch();
				yield* Fiber.join(fiber);
				expect(presented).toHaveLength(1);
				expect(presented[0]?.selection).toBe(segmentKey(sentenceId, 2));

				// Advancing past the timeout after early completion must not double-present.
				yield* TestClock.adjust(STORED_DEAL_WAIT_MS * 2);
				expect(presented).toHaveLength(1);
				registry.dispose();
			}).pipe(Effect.provide(TestClock.layer())),
		);
	});

	test("falls back to presenting cards after STORED_DEAL_WAIT_MS when prefetch hangs", async () => {
		await Effect.runPromise(
			Effect.gen(function* () {
				const registry = AtomRegistry.make();
				const prefetchStarted = Deferred.makeUnsafe<void>();
				const presented: string[] = [];

				const fiber = yield* Effect.forkDetach(
					scheduleSegmentSelection(
						registry,
						{
							visitorId: "visitor-1",
							sentenceId,
							clickedSegmentIndex: 0,
							anchorElement: { id: "anchor-0" },
						},
						{
							selectSegment: async () => availableFor("0"),
							prefetchNotes: () =>
								new Promise<void>(() => {
									Deferred.doneUnsafe(
										prefetchStarted,
										Exit.void,
									);
								}),
							presentCards: (_cards, options) => {
								presented.push(options.selection);
							},
							createRequestId: () => "req-0",
							inspect: false,
						},
					),
					{ startImmediately: true },
				);

				yield* Deferred.await(prefetchStarted);
				yield* TestClock.adjust(STORED_DEAL_WAIT_MS - 1);
				expect(presented).toEqual([]);

				yield* TestClock.adjust(1);
				yield* Fiber.join(fiber);
				expect(presented).toEqual([segmentKey(sentenceId, 0)]);
				registry.dispose();
			}).pipe(Effect.provide(TestClock.layer())),
		);
	});

	test("presents a Resolving route immediately without waiting for prefetch", async () => {
		const registry = AtomRegistry.make();
		let prefetchCalls = 0;
		const presented: string[] = [];

		const outcome = await runCommandEffect(
			scheduleSegmentSelection(
				registry,
				{
					visitorId: "visitor-1",
					sentenceId,
					clickedSegmentIndex: 1,
					anchorElement: { id: "anchor-1" },
				},
				{
					selectSegment: async () => resolvingFor("session-1"),
					prefetchNotes: async () => {
						prefetchCalls++;
					},
					presentCards: (_cards, options) => {
						presented.push(options.selection);
					},
					createRequestId: () => "req-1",
					inspect: false,
				},
			),
		);

		expect(AsyncResult.isSuccess(outcome)).toBe(true);
		expect(prefetchCalls).toBe(0);
		expect(presented).toEqual([segmentKey(sentenceId, 1)]);
		registry.dispose();
	});

	test("rapid clicks supersede an in-flight selectSegment so stale clicks never prefetch or present", async () => {
		const registry = AtomRegistry.make();
		const firstAsked = Deferred.makeUnsafe<void>();
		let resolveFirst!: (value: ReturnType<typeof availableFor>) => void;
		const prefetched: string[] = [];
		const presented: string[] = [];

		const firstClick = runCommandEffect(
			scheduleSegmentSelection(
				registry,
				{
					visitorId: "visitor-1",
					sentenceId,
					clickedSegmentIndex: 0,
					anchorElement: { id: "anchor-0" },
				},
				{
					selectSegment: () =>
						new Promise((resolve) => {
							resolveFirst = resolve;
							Deferred.doneUnsafe(firstAsked, Exit.void);
						}),
					prefetchNotes: async () => {
						prefetched.push("first");
					},
					presentCards: (_cards, options) => {
						presented.push(options.selection);
					},
					createRequestId: () => "req-first",
					inspect: false,
				},
			),
		);

		await Effect.runPromise(Deferred.await(firstAsked));

		const secondOutcome = await runCommandEffect(
			scheduleSegmentSelection(
				registry,
				{
					visitorId: "visitor-1",
					sentenceId,
					clickedSegmentIndex: 2,
					anchorElement: { id: "anchor-2" },
				},
				{
					selectSegment: async () => availableFor("2"),
					prefetchNotes: async () => {
						prefetched.push("second");
					},
					presentCards: (_cards, options) => {
						presented.push(options.selection);
					},
					createRequestId: () => "req-second",
					inspect: false,
				},
			),
		);

		// Even when the stale RPC eventually resolves, it must neither prefetch nor present.
		resolveFirst(availableFor("0"));
		const firstOutcome = await firstClick;

		expect(isCommandInterrupted(firstOutcome)).toBe(true);
		expect(AsyncResult.isSuccess(secondOutcome)).toBe(true);
		expect(prefetched).toEqual(["second"]);
		expect(presented).toEqual([segmentKey(sentenceId, 2)]);
		registry.dispose();
	});

	test("rapid clicks supersede an in-flight prefetch timeout without leaking a stale presentation", async () => {
		await Effect.runPromise(
			Effect.gen(function* () {
				const registry = AtomRegistry.make();
				const firstPrefetchStarted = Deferred.makeUnsafe<void>();
				const presented: string[] = [];

				const firstFiber = yield* Effect.forkDetach(
					scheduleSegmentSelection(
						registry,
						{
							visitorId: "visitor-1",
							sentenceId,
							clickedSegmentIndex: 0,
							anchorElement: { id: "anchor-0" },
						},
						{
							selectSegment: async () => availableFor("0"),
							prefetchNotes: () =>
								new Promise<void>(() => {
									Deferred.doneUnsafe(
										firstPrefetchStarted,
										Exit.void,
									);
								}),
							presentCards: (_cards, options) => {
								presented.push(options.selection);
							},
							createRequestId: () => "req-first",
							inspect: false,
						},
					),
					{ startImmediately: true },
				);

				yield* Deferred.await(firstPrefetchStarted);
				yield* TestClock.adjust(100);

				const secondFiber = yield* Effect.forkDetach(
					scheduleSegmentSelection(
						registry,
						{
							visitorId: "visitor-1",
							sentenceId,
							clickedSegmentIndex: 2,
							anchorElement: { id: "anchor-2" },
						},
						{
							selectSegment: async () => resolvingFor("res-2"),
							prefetchNotes: async () => {},
							presentCards: (_cards, options) => {
								presented.push(options.selection);
							},
							createRequestId: () => "req-second",
							inspect: false,
						},
					),
					{ startImmediately: true },
				);

				yield* Fiber.join(secondFiber);
				const firstExit = yield* Fiber.await(firstFiber);

				// Advancing past the first click's timeout window must never present the stale deck.
				yield* TestClock.adjust(STORED_DEAL_WAIT_MS * 2);

				expect(
					isCommandInterrupted(AsyncResult.fromExit(firstExit)),
				).toBe(true);
				expect(presented).toEqual([segmentKey(sentenceId, 2)]);
				registry.dispose();
			}).pipe(Effect.provide(TestClock.layer())),
		);
	});

	test("surfaces ConvexError failures cleanly and recovers on the next click", async () => {
		const registry = AtomRegistry.make();
		const rateLimited = new ConvexError({ message: "Slow down a moment." });
		const presented: string[] = [];

		const failed = await runCommandEffect(
			scheduleSegmentSelection(
				registry,
				{
					visitorId: "visitor-1",
					sentenceId,
					clickedSegmentIndex: 0,
					anchorElement: { id: "anchor-0" },
				},
				{
					selectSegment: async () => {
						throw rateLimited;
					},
					prefetchNotes: async () => {},
					presentCards: (_cards, options) => {
						presented.push(options.selection);
					},
					createRequestId: () => "req-fail",
					inspect: false,
				},
			),
		);

		expect(AsyncResult.isFailure(failed)).toBe(true);
		expect(isCommandInterrupted(failed)).toBe(false);
		if (AsyncResult.isFailure(failed)) {
			expect(squashCommandFailure(failed)).toBe(rateLimited);
		}
		expect(presented).toEqual([]);

		const recovered = await runCommandEffect(
			scheduleSegmentSelection(
				registry,
				{
					visitorId: "visitor-1",
					sentenceId,
					clickedSegmentIndex: 2,
					anchorElement: { id: "anchor-2" },
				},
				{
					selectSegment: async () => availableFor("2"),
					prefetchNotes: async () => {},
					presentCards: (_cards, options) => {
						presented.push(options.selection);
					},
					createRequestId: () => "req-ok",
					inspect: false,
				},
			),
		);

		expect(AsyncResult.isSuccess(recovered)).toBe(true);
		expect(presented).toEqual([segmentKey(sentenceId, 2)]);
		registry.dispose();
	});

	test("aborting via AbortSignal cancels an in-flight selection without presenting cards", async () => {
		const registry = AtomRegistry.make();
		const started = Deferred.makeUnsafe<void>();
		const controller = new AbortController();
		const presented: string[] = [];

		const pending = runCommandEffect(
			scheduleSegmentSelection(
				registry,
				{
					visitorId: "visitor-1",
					sentenceId,
					clickedSegmentIndex: 0,
					anchorElement: { id: "anchor-0" },
				},
				{
					selectSegment: () =>
						new Promise(() => {
							Deferred.doneUnsafe(started, Exit.void);
						}),
					prefetchNotes: async () => {},
					presentCards: (_cards, options) => {
						presented.push(options.selection);
					},
					createRequestId: () => "req-abort",
					inspect: false,
				},
			),
			{ signal: controller.signal },
		);

		await Effect.runPromise(Deferred.await(started));
		controller.abort();

		const outcome = await pending;
		expect(isCommandInterrupted(outcome)).toBe(true);
		expect(presented).toEqual([]);
		registry.dispose();
	});
});
