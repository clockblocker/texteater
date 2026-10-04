import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useConvex, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useCallback, useReducer, useRef, useState } from "react";
import { visitorErrorMessage } from "@/lib/visitor-error";
import { NotFoundView } from "@/views/not-found-view";
import { usePaginatedNoteLoading } from "@/views/paginated-note-loading";
import { PlacedNote, PlacedNoteSkeleton } from "@/workspace/note-part";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import type { ShadowNoteTarget } from "../../shared/navigation";
import { reduceShadowControls } from "./shadow-note-controls";

type ShadowNote = Extract<
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
	const noteQuery = useQuery(
		convexQuery(api.shadowNotes.get, {
			shadowId: target.shadowId,
		}),
	);
	if (noteQuery.isPending)
		return <PlacedNoteSkeleton kind="Shadow" presentation={presentation} />;
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
	const { note: loadedNote, pagination } = usePaginatedNoteLoading(
		note,
		loadShadowPage,
	);
	const [activeLocator, setActiveLocator] = useState<string | null>(null);
	const [controls, dispatchControls] = useReducer(reduceShadowControls, {
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
			if (attempt !== actionEpoch.current) return;
			await onRefresh();
			if (attempt !== actionEpoch.current) return;
			dispatchControls({ type: "settled", result });
		} catch (cause) {
			if (attempt !== actionEpoch.current) return;
			dispatchControls({
				type: "failed",
				message: visitorErrorMessage(cause),
			});
		} finally {
			if (attempt === actionEpoch.current) {
				setActiveLocator(null);
			}
		}
	}

	const capabilities = {
		presentation,
		references: { items: loadedNote.references.page, ...pagination },
		cleanup: {
			activeLocator,
			actionError: controls.actionError,
			outcome: controls.outcome,
			resolve: cleanUp,
		},
		follow,
	};
	return <PlacedNote input={{ noteData: loadedNote, capabilities }} />;
}
