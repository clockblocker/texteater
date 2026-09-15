import { useState } from "react";

import { usePendingMutation } from "@/hooks/use-pending-mutation";
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
	const { presentCards } = useWorkspaceInteraction();
	const [routeNotesEnabled] = useRouteNotePreference();
	const selectSegment = usePendingMutation(
		api.resolutionSessions.selectSegment,
	);
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
			const result = await selectSegment.run({
				requestId,
				visitorId,
				sentenceId,
				clickedSegmentIndex,
				routeNoteRequested: shouldRequestRouteNote(
					routeNotesEnabled,
					altKey,
				),
			});
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

	return { select, selectedSegmentKey, error } as const;
}
