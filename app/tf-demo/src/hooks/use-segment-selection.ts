import { useMutation } from "convex/react";
import { useState } from "react";

import {
	shouldRequestRouteNote,
	useRouteNotePreference,
} from "@/lib/route-note-preference";
import { segmentSelectionDeckCards } from "@/views/segment-selection-deck";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function segmentKey(sentenceId: string, segmentIndex: number): string {
	return `${sentenceId}:${segmentIndex}`;
}

/**
 * One Segment Selection, wherever the Segment lives: the reader or a
 * Definition block. Presents the resulting deck of Cards below the clicked
 * word and remembers which Segment is selected until the next click.
 */
export function useSegmentSelection(visitorId: string) {
	const recordSelectionTiming = useMutation(
		api.resolutionInspection.recordSelectionTiming,
	);
	const { presentCards } = useWorkspaceInteraction();
	const [routeNotesEnabled] = useRouteNotePreference();
	const selectSegment = useMutation(api.resolutionSessions.selectSegment);
	const [selectedSegmentKey, setSelectedSegmentKey] = useState<string | null>(
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
		setSelectedSegmentKey(segmentKey(sentenceId, clickedSegmentIndex));
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
				routeNoteRequested: shouldRequestRouteNote(
					routeNotesEnabled,
					altKey,
				),
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
			presentCards(segmentSelectionDeckCards(requestId, result), {
				anchor: anchorElement,
			});
		} catch (cause) {
			setSelectedSegmentKey(null);
			setError(
				cause instanceof Error
					? cause.message
					: "Segment resolution failed.",
			);
		}
	}

	/** Marks a Segment selected without a Segment Selection, as an arrival does. */
	function markSelected(sentenceId: string, segmentIndex: number): void {
		setSelectedSegmentKey(segmentKey(sentenceId, segmentIndex));
	}

	return { select, markSelected, selectedSegmentKey, error } as const;
}
