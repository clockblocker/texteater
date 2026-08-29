import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useAction, useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import type { ShadowNoteTarget } from "@/lib/navigation";
import { renderNote } from "@/notes";
import { usePaginatedNoteLoading } from "@/notes/paginated-note-loading";
import type {
	ShadowNoteData,
	ShadowNotePresentationCapabilities,
} from "@/notes/shadow";
import { NotFoundView } from "@/views/not-found-view";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";

export type ShadowNote = ShadowNoteData;
type ShadowCleanupResult = FunctionReturnType<
	typeof api.orchestration.cleanupPendingRelation
>;

export function isCurrentShadowAction(
	attempt: number,
	currentEpoch: number,
): boolean {
	return attempt === currentEpoch;
}

export function shadowCleanupFeedback(result: ShadowCleanupResult): {
	actionError: string | null;
	outcome: string | null;
} {
	if (result.status === "applied") {
		return { actionError: null, outcome: result.message };
	}
	return {
		actionError:
			result.status === "conflict"
				? `${result.message} The Shadow Note was refreshed.`
				: result.message,
		outcome: null,
	};
}

export type ShadowControlState = {
	targetShadowId: string;
	actionError: string | null;
	outcome: string | null;
};

export type ShadowControlEvent =
	| { type: "begin" }
	| { type: "settled"; result: ShadowCleanupResult }
	| { type: "failed"; message: string }
	| { type: "targetChanged"; targetShadowId: string }
	| { type: "refreshed"; targetShadowId: string };

export function reduceShadowControls(
	state: ShadowControlState,
	event: ShadowControlEvent,
): ShadowControlState {
	if (event.type === "targetChanged") {
		return event.targetShadowId === state.targetShadowId
			? state
			: {
					targetShadowId: event.targetShadowId,
					actionError: null,
					outcome: null,
				};
	}
	if (event.type === "refreshed") return state;
	if (event.type === "begin") {
		return { ...state, actionError: null, outcome: null };
	}
	if (event.type === "failed") {
		return { ...state, actionError: event.message, outcome: null };
	}
	return { ...state, ...shadowCleanupFeedback(event.result) };
}

export function ShadowNoteView({ target }: { target: ShadowNoteTarget }) {
	const noteQuery = useQuery({
		...convexQuery(api.shadowNotes.get, {
			shadowId: target.shadowId,
		}),
		gcTime: 10_000,
	});
	if (noteQuery.isPending) return <ShadowNoteSkeleton />;
	if (noteQuery.data?.kind !== "ShadowNote") {
		return (
			<NotFoundView
				title="Shadow note not found"
				description="This Shadow Note is missing, malformed, or no longer has an active reference."
			/>
		);
	}
	return (
		<ShadowNoteContainer
			note={noteQuery.data}
			onRefresh={() => noteQuery.refetch().then(() => undefined)}
		/>
	);
}

function ShadowNoteContainer({
	note,
	onRefresh,
}: {
	note: ShadowNote;
	onRefresh: () => Promise<void>;
}) {
	const { follow } = useWorkspaceInteraction();
	const convex = useConvex();
	const cleanupPendingRelation = useAction(
		api.orchestration.cleanupPendingRelation,
	);
	const loadShadowPage = useCallback(
		async (cursor: string): Promise<ShadowNote | null> => {
			const next = await convex.query(api.shadowNotes.get, {
				shadowId: note.target.shadowId,
				contextCursor: cursor,
			});
			return next?.kind === "ShadowNote" ? next : null;
		},
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

	useEffect(() => {
		setActiveLocator(null);
		dispatchControls({
			type: "refreshed",
			targetShadowId: note.target.shadowId,
		});
	}, [note]);
	useEffect(() => {
		actionEpoch.current += 1;
		dispatchControls({
			type: "targetChanged",
			targetShadowId: note.target.shadowId,
		});
	}, [note.target.shadowId]);

	async function cleanUp(locatorKey: string) {
		if (activeLocator) return;
		const attempt = ++actionEpoch.current;
		setActiveLocator(locatorKey);
		dispatchControls({ type: "begin" });
		try {
			const result = await cleanupPendingRelation({
				shadowId: note.target.shadowId,
				locatorKey,
				baseRevision: note.inspection.revision,
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

	const capabilities: ShadowNotePresentationCapabilities = {
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
	return renderNote(pagination.note, capabilities);
}

function ShadowNoteSkeleton() {
	return (
		<div className="flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div
				className="mx-auto flex w-full max-w-4xl flex-col gap-3"
				role="status"
			>
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-20 w-full" />
			</div>
		</div>
	);
}
