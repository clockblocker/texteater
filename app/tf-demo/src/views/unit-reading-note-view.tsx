import { convexQuery } from "@convex-dev/react-query";
import {
	useQuery,
	useMutation as useReactQueryMutation,
} from "@tanstack/react-query";
import { useAction, useConvex } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import type { KnowledgeSettings } from "dumrel";
import { useCallback } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import type { ReadingNoteTarget } from "@/lib/navigation";
import {
	normalizeReadingDefinition,
	readingDefinitionChange,
} from "@/lib/reading-definition";
import { renderNote } from "@/notes";
import { NotFoundView } from "@/views/not-found-view";
import { usePaginatedNoteLoading } from "@/views/paginated-note-loading";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";

export type UnitReadingNote = Extract<
	NonNullable<FunctionReturnType<typeof api.readingNotes.get>>,
	{ readonly kind: "Reading" }
>;

export function UnitReadingNoteView({
	target,
	presentation = "Sheet",
}: {
	presentation?: "Card" | "Sheet";
	target: ReadingNoteTarget;
}) {
	const visitorId = useAnonymousVisitorId();
	const noteQuery = useQuery({
		...convexQuery(api.readingNotes.get, {
			readingId: target.readingId,
			visitorId,
		}),
		gcTime: 10_000,
	});
	const settingsQuery = useQuery({
		...convexQuery(api.knowledgeSettings.get, { visitorId }),
		gcTime: 10_000,
	});

	if (noteQuery.isPending || settingsQuery.isPending) {
		return <ReadingNoteSkeleton />;
	}
	if (noteQuery.data?.kind !== "Reading" || !settingsQuery.data) {
		return (
			<NotFoundView
				title="Reading note not found"
				description="This Reading Note does not exist, was removed, or its Reading is not a supported Unit family."
			/>
		);
	}

	return (
		<ReadingNoteContainer
			key={noteQuery.data.target.readingId}
			visitorId={visitorId}
			presentation={presentation}
			note={noteQuery.data}
			knowledgeSettings={settingsQuery.data}
		/>
	);
}

function ReadingNoteContainer({
	presentation,
	visitorId,
	note,
	knowledgeSettings,
}: {
	presentation: "Card" | "Sheet";
	visitorId: string;
	note: UnitReadingNote;
	knowledgeSettings: KnowledgeSettings;
}) {
	const { follow } = useWorkspaceInteraction();
	const convex = useConvex();
	const applyKnowledgeChangeAction = useAction(
		api.orchestration.applyReadingKnowledgeChange,
	);
	const definitionMutation = useReactQueryMutation({
		mutationFn: applyKnowledgeChangeAction,
	});
	const loadSourceContextPage = useCallback(
		async (cursor: string): Promise<UnitReadingNote | null> => {
			const next = await convex.query(api.readingNotes.get, {
				readingId: note.target.readingId,
				visitorId,
				contextCursor: cursor,
			});
			return next?.kind === "Reading" ? next : null;
		},
		[convex, note.target.readingId, visitorId],
	);
	const pagination = usePaginatedNoteLoading(note, loadSourceContextPage);

	async function saveDefinition(definition: string | null) {
		const args = readingDefinitionMutationArgs(
			note,
			definition,
			crypto.randomUUID(),
		);
		if (args) await definitionMutation.mutateAsync(args);
	}
	const capabilities = {
		presentation,
		knowledgeSettings,
		sourceContexts: {
			items: pagination.note.sourceContexts.page,
			hasMore: pagination.hasMore,
			isLoading: pagination.isLoading,
			error: pagination.error,
			loadMore: pagination.hasMore ? pagination.loadMore : null,
		},
		definition: {
			isSaving: definitionMutation.isPending,
			error: definitionMutation.error
				? mutationMessage(definitionMutation.error)
				: null,
			save: saveDefinition,
		},
		follow,
	};

	return (
		<div
			className="reading-note-container"
			data-note-presentation={presentation}
		>
			{renderNote({ noteData: pagination.note, capabilities })}
		</div>
	);
}

export function readingDefinitionMutationArgs(
	note: UnitReadingNote,
	definition: string | null,
	knowledgeChangeKey: string,
) {
	const normalized = normalizeReadingDefinition(definition);
	const change = readingDefinitionChange(
		normalizeReadingDefinition(note.knowledge.definition ?? null),
		normalized,
	);
	if (!change) return null;
	return {
		knowledgeChangeKey,
		ownerReadingKey: note.reading.ownerKey,
		change,
	};
}

function ReadingNoteSkeleton() {
	return (
		<div className="flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div
				className="mx-auto flex w-full max-w-5xl flex-col gap-3"
				role="status"
				aria-label="Loading Reading note"
			>
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-20 w-full" />
			</div>
		</div>
	);
}

function mutationMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Knowledge update failed.";
}
