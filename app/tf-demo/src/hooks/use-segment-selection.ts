import { useMutation } from "convex/react";
import { useState } from "react";

import { useRouteNotePreference } from "@/lib/route-note-preference";
import { visitorErrorMessage } from "@/lib/visitor-error";
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
 * One Segment Selection, wherever the Segment lives: the reader or a
 * Definition block. Deals the resulting Cards to the Sheet the word was
 * clicked in. The clicked Segment is lit while the selection runs, and from
 * then on for as long as the Deck it dealt is live.
 */
export function useSegmentSelection(visitorId: string) {
	const recordSelectionTiming = useMutation(
		api.resolutionInspection.recordSelectionTiming,
	);
	const { presentCards } = useWorkspaceInteraction();
	const dealtSelection = useDealtSelection();
	const [routeNotesEnabled] = useRouteNotePreference();
	const selectSegment = useMutation(api.resolutionSessions.selectSegment);
	const [pendingSegmentKey, setPendingSegmentKey] = useState<string | null>(
		null,
	);
	const [error, setError] = useState<string | null>(null);

	async function select(
		sentenceId: Id<"sentences">,
		clickedSegmentIndex: number,
		altKey: boolean,
		anchorElement: HTMLElement,
	): Promise<void> {
		setError(null);
		const selection = segmentKey(sentenceId, clickedSegmentIndex);
		setPendingSegmentKey(selection);
		try {
			const requestId = crypto.randomUUID();
			const startedAt = Date.now();
			const clock = performance.now();
			const routeNoteRequested = routeNotesEnabled || altKey;
			const result = await selectSegment({
				requestId,
				visitorId,
				sentenceId,
				clickedSegmentIndex,
				inspect: import.meta.env.DEV,
				routeNoteRequested,
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
			presentCards(
				segmentSelectionDeckCards(
					requestId,
					result,
					routeNoteRequested ? "Attestation" : "Reading",
				),
				{ anchor: anchorElement, selection },
			);
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
