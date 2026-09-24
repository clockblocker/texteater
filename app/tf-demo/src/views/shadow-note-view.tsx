import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useConvex, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useCallback, useReducer, useRef, useState } from "react";
import type { ShadowNoteTarget } from "@/lib/navigation";
import { renderNote } from "@/notes";
import { NotFoundView } from "@/views/not-found-view";
import { ShadowNoteSkeleton } from "@/views/note-skeletons";
import { usePaginatedNoteLoading } from "@/views/paginated-note-loading";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import {
	isCurrentShadowAction,
	reduceShadowControls,
} from "./shadow-note-controls";

export type ShadowNote = Extract<
	NonNullable<FunctionReturnType<typeof api.shadowNotes.get>>,
	{ readonly kind: "Shadow" }
>;
export function ShadowNoteView({
	target,
	presentation = "Sheet",
}: {
	target: ShadowNoteTarget;
	presentation?: "Card" | "Sheet";
}) {
	const noteQuery = useQuery({
		...convexQuery(api.shadowNotes.get, {
			shadowId: target.shadowId,
		}),
		gcTime: 10_000,
	});
	if (noteQuery.isPending)
		return <ShadowNoteSkeleton presentation={presentation} />;
	if (noteQuery.data?.kind !== "Shadow") {
		return (
			<NotFoundView
				title="Shadow note not found"
				description="This Shadow Note is missing, malformed, or no longer has an active reference."
			/>
		);
	}
	return (
		<ShadowNoteContainer
			key={noteQuery.data.target.shadowId}
			note={noteQuery.data}
			presentation={presentation}
			onRefresh={() => noteQuery.refetch().then(() => undefined)}
		/>
	);
}

function ShadowNoteContainer({
	note,
	presentation,
	onRefresh,
}: {
	note: ShadowNote;
	presentation: "Card" | "Sheet";
	onRefresh: () => Promise<void>;
}) {
	const { follow } = useWorkspaceInteraction();
	const convex = useConvex();
	const cleanupPendingRelation = useMutation(
		api.shadowResolution.cleanupPendingRelation,
	);
	const loadShadowPage = useCallback(
		(cursor: string) =>
			convex.query(api.shadowNotes.references, {
				shadowId: note.target.shadowId,
				cursor,
			}),
		[convex, note.target.shadowId],
	);
	const pagination = usePaginatedNoteLoading(note, loadShadowPage);
	const [activeLocator, setActiveLocator] = useState<string | null>(null);
	const [controls, dispatchControls] = useReducer(reduceShadowControls, {
		targetShadowId: note.target.shadowId,
		actionError: null,
		outcome: null,
	});
	const actionEpoch = useRef(0);

	async function cleanUp(locatorKey: string) {
		if (activeLocator) return;
		const attempt = ++actionEpoch.current;
		setActiveLocator(locatorKey);
		dispatchControls({ type: "begin" });
		try {
			const result = await cleanupPendingRelation({
				shadowId: note.target.shadowId,
				locatorKey,
			});
			if (!isCurrentShadowAction(attempt, actionEpoch.current)) return;
			await onRefresh();
			if (!isCurrentShadowAction(attempt, actionEpoch.current)) return;
			dispatchControls({ type: "settled", result });
		} catch (cause) {
			if (!isCurrentShadowAction(attempt, actionEpoch.current)) return;
			dispatchControls({
				type: "failed",
				message:
					cause instanceof Error
						? cause.message
						: "The Shadow reference could not be changed.",
			});
		} finally {
			if (isCurrentShadowAction(attempt, actionEpoch.current)) {
				setActiveLocator(null);
			}
		}
	}

	const capabilities = {
		presentation,
		references: {
			items: pagination.note.references.page,
			hasMore: pagination.hasMore,
			isLoading: pagination.isLoading,
			error: pagination.error,
			loadMore: pagination.hasMore ? pagination.loadMore : null,
		},
		cleanup: {
			activeLocator,
			actionError: controls.actionError,
			outcome: controls.outcome,
			resolve: cleanUp,
		},
		follow,
	};
	return renderNote({ noteData: pagination.note, capabilities });
}
