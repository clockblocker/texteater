import { RegistryContext } from "@effect/atom-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import * as Effect from "effect/Effect";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { useContext, useEffect, useRef, useState } from "react";

import {
	createCommandScheduler,
	isCommandInterrupted,
	runCommandEffect,
	squashCommandFailure,
	tryCommandPromise,
} from "@/lib/command-scheduler";
import { visitorErrorMessage } from "@/lib/visitor-error";
import { prefetchCardNotes } from "@/views/card-note-prefetch";
import { segmentSelectionDeckCards } from "@/views/resolution-deck";
import {
	useDealtSelection,
	useWorkspaceInteraction,
	type WorkspaceCardTarget,
} from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function segmentKey(sentenceId: string, segmentIndex: number): string {
	return `${sentenceId}:${segmentIndex}`;
}

/**
 * How long a stored route's Deck waits for its Notes before it is dealt
 * anyway, showing bones for the ones still loading (#1316's threshold).
 */
export const STORED_DEAL_WAIT_MS = 300;

type SegmentSelectionResult = FunctionReturnType<
	typeof api.resolutionSessions.selectSegment
>;

const segmentSelectionScheduler = createCommandScheduler();

interface SegmentSelectionRequest<Anchor = HTMLElement> {
	readonly visitorId: string;
	readonly sentenceId: Id<"sentences">;
	readonly clickedSegmentIndex: number;
	readonly anchorElement: Anchor;
}

interface SegmentSelectionDependencies<Anchor = HTMLElement> {
	readonly selectSegment: (args: {
		readonly requestId: string;
		readonly visitorId: string;
		readonly sentenceId: Id<"sentences">;
		readonly clickedSegmentIndex: number;
		readonly inspect: boolean;
	}) => Promise<SegmentSelectionResult>;
	readonly recordSelectionTiming?: (args: {
		readonly requestId: string;
		readonly visitorId: string;
		readonly startedAt: number;
		readonly durationMs: number;
	}) => Promise<unknown>;
	readonly prefetchNotes: (
		cards: readonly WorkspaceCardTarget[],
	) => Promise<void>;
	readonly presentCards: (
		cards: readonly WorkspaceCardTarget[],
		options: { readonly anchor: Anchor; readonly selection: string },
	) => void;
	readonly createRequestId?: () => string;
	readonly now?: () => number;
	readonly clock?: () => number;
	readonly inspect?: boolean;
	readonly storedDealWaitMs?: number;
}

/**
 * Schedules one Segment Selection under `latest` concurrency per Visitor so a
 * newer click supersedes any in-flight `selectSegment` call or stored-Note
 * prefetch wait. Stored-Note prefetching uses `Effect.timeoutOption`, leaving
 * no dangling timers when notes load early or when a newer click interrupts.
 */
export function scheduleSegmentSelection<Anchor = HTMLElement>(
	registry: AtomRegistry.AtomRegistry,
	request: SegmentSelectionRequest<Anchor>,
	deps: SegmentSelectionDependencies<Anchor>,
) {
	const selection = segmentKey(
		request.sentenceId,
		request.clickedSegmentIndex,
	);
	const createRequestId = deps.createRequestId ?? (() => crypto.randomUUID());
	const now = deps.now ?? (() => Date.now());
	const clock = deps.clock ?? (() => performance.now());
	const inspect = deps.inspect ?? import.meta.env.DEV;
	const storedDealWaitMs = deps.storedDealWaitMs ?? STORED_DEAL_WAIT_MS;

	return segmentSelectionScheduler.schedule(
		registry,
		{
			mode: "latest",
			key: (input) => `segment-selection:${input.visitorId}`,
		},
		request,
		Effect.gen(function* () {
			const requestId = createRequestId();
			const startedAt = now();
			const startClock = clock();
			const result = yield* tryCommandPromise(() =>
				deps.selectSegment({
					requestId,
					visitorId: request.visitorId,
					sentenceId: request.sentenceId,
					clickedSegmentIndex: request.clickedSegmentIndex,
					inspect,
				}),
			);
			if (inspect && deps.recordSelectionTiming) {
				void deps
					.recordSelectionTiming({
						requestId,
						visitorId: request.visitorId,
						startedAt,
						durationMs: clock() - startClock,
					})
					.catch(() =>
						console.warn("Selection timing could not be recorded."),
					);
			}
			// A repeat click joins the Visitor's running session, so a
			// Resolving deck follows the returned requestId, not this one.
			const cards = segmentSelectionDeckCards(
				requestId,
				result,
				request.clickedSegmentIndex,
			);
			if (result.kind === "Available") {
				yield* tryCommandPromise(() => deps.prefetchNotes(cards)).pipe(
					Effect.timeoutOption(storedDealWaitMs),
				);
			}
			yield* Effect.sync(() => {
				deps.presentCards(cards, {
					anchor: request.anchorElement,
					selection,
				});
			});
		}),
	);
}

/**
 * One Segment Selection, wherever the Segment lives: the reader or a
 * Definition block. Deals the resulting Cards to the Sheet the word was
 * clicked in. The clicked Segment is lit while the selection runs, and from
 * then on for as long as the Deck it dealt is live. A stored route's Notes
 * are loaded before its Deck is dealt, so its Cards arrive filled in.
 */
export function useSegmentSelection(visitorId: string) {
	const registry = useContext(RegistryContext);
	const recordSelectionTiming = useMutation(
		api.resolutionInspection.recordSelectionTiming,
	);
	const { presentCards } = useWorkspaceInteraction();
	const dealtSelection = useDealtSelection();
	const selectSegment = useMutation(api.resolutionSessions.selectSegment);
	const queryClient = useQueryClient();
	const [pendingSegmentKey, setPendingSegmentKey] = useState<string | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);
	const activeRunIdRef = useRef(0);
	const unmountAbortRef = useRef<AbortController | null>(null);

	// oxlint-disable-next-line textfresser/no-unreasoned-state-sync -- owns the unmount AbortController that cancels in-flight segment selection
	useEffect(() => {
		const controller = new AbortController();
		unmountAbortRef.current = controller;
		return () => {
			activeRunIdRef.current++;
			controller.abort();
			if (unmountAbortRef.current === controller) {
				unmountAbortRef.current = null;
			}
		};
	}, []);

	async function select(
		sentenceId: Id<"sentences">,
		clickedSegmentIndex: number,
		anchorElement: HTMLElement,
	): Promise<void> {
		const runId = ++activeRunIdRef.current;
		const selection = segmentKey(sentenceId, clickedSegmentIndex);
		setError(null);
		setPendingSegmentKey(selection);

		const outcome = await runCommandEffect(
			scheduleSegmentSelection(
				registry,
				{
					visitorId,
					sentenceId,
					clickedSegmentIndex,
					anchorElement,
				},
				{
					selectSegment,
					recordSelectionTiming,
					prefetchNotes: (cards) =>
						prefetchCardNotes(queryClient, visitorId, cards),
					presentCards,
				},
			),
			{ signal: unmountAbortRef.current?.signal },
		);

		if (activeRunIdRef.current === runId) {
			if (
				AsyncResult.isFailure(outcome) &&
				!isCommandInterrupted(outcome)
			) {
				setError(visitorErrorMessage(squashCommandFailure(outcome)));
			}
			setPendingSegmentKey(null);
		}
	}

	return {
		select,
		selectedSegmentKey: pendingSegmentKey ?? dealtSelection,
		error,
	} as const;
}
