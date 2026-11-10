import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "convex/react";
import { useState } from "react";

import { visitorErrorMessage } from "@/lib/visitor-error";
import { prefetchCardNotes } from "@/views/card-note-prefetch";
import { segmentSelectionDeckCards } from "@/views/resolution-deck";
import {
	useDealtSelection,
	useWorkspaceInteraction,
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

/**
 * One Segment Selection, wherever the Segment lives: the reader or a
 * Definition block. Deals the resulting Cards to the Sheet the word was
 * clicked in. The clicked Segment is lit while the selection runs, and from
 * then on for as long as the Deck it dealt is live. A stored route's Notes
 * are loaded before its Deck is dealt, so its Cards arrive filled in.
 */
export function useSegmentSelection(visitorId: string) {
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

	async function select(
		sentenceId: Id<"sentences">,
		clickedSegmentIndex: number,
		anchorElement: HTMLElement,
	): Promise<void> {
		setError(null);
		const selection = segmentKey(sentenceId, clickedSegmentIndex);
		setPendingSegmentKey(selection);
		try {
			const requestId = crypto.randomUUID();
			const startedAt = Date.now();
			const clock = performance.now();
			const result = await selectSegment({
				requestId,
				visitorId,
				sentenceId,
				clickedSegmentIndex,
				inspect: import.meta.env.DEV,
			});
			if (import.meta.env.DEV) {
				void recordSelectionTiming({
					requestId,
					visitorId,
					startedAt,
					durationMs: performance.now() - clock,
				}).catch(() =>
					console.warn("Selection timing could not be recorded."),
				);
			}
			// A repeat click joins the Visitor's running session, so a
			// Resolving deck follows the returned requestId, not this one.
			const cards = segmentSelectionDeckCards(
				requestId,
				result,
				clickedSegmentIndex,
			);
			if (result.kind === "Available")
				await Promise.race([
					prefetchCardNotes(queryClient, visitorId, cards),
					new Promise((resolve) =>
						setTimeout(resolve, STORED_DEAL_WAIT_MS),
					),
				]);
			presentCards(cards, { anchor: anchorElement, selection });
		} catch (cause) {
			setError(visitorErrorMessage(cause));
		} finally {
			setPendingSegmentKey((pending) =>
				pending === selection ? null : pending,
			);
		}
	}

	return {
		select,
		selectedSegmentKey: pendingSegmentKey ?? dealtSelection,
		error,
	} as const;
}
