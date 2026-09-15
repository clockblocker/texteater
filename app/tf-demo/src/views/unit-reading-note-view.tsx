import { convexQuery } from "@convex-dev/react-query";
import {
	useQuery,
	useMutation as useReactQueryMutation,
} from "@tanstack/react-query";
import { useAction, useConvex, useMutation } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useCallback, useEffect } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { useSegmentSelection } from "@/hooks/use-segment-selection";
import type { ReadingNoteTarget } from "@/lib/navigation";
import { renderNote } from "@/notes";
import { NotFoundView } from "@/views/not-found-view";
import { ReadingNoteSkeleton } from "@/views/note-skeletons";
import { usePaginatedNoteLoading } from "@/views/paginated-note-loading";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import type { KnowledgePreferences } from "../../shared/knowledge-preferences";

export type UnitReadingNote = Extract<
	NonNullable<FunctionReturnType<typeof api.readingNotes.get>>,
	{ readonly kind: "Reading" }
>;

export function UnitReadingNoteView({
	target,
	presentation = "Sheet",
	visitorId: visitorIdOverride,
}: {
	presentation?: "Card" | "Sheet";
	target: ReadingNoteTarget;
	visitorId?: string;
}) {
	const anonymousVisitorId = useAnonymousVisitorId();
	const visitorId = visitorIdOverride ?? anonymousVisitorId;
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
		return <ReadingNoteSkeleton presentation={presentation} />;
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
			focus={target.focus ?? null}
		/>
	);
}

function ReadingNoteContainer({
	presentation,
	visitorId,
	note,
	knowledgeSettings,
	focus,
}: {
	presentation: "Card" | "Sheet";
	visitorId: string;
	note: UnitReadingNote;
	knowledgeSettings: KnowledgePreferences;
	focus: ReadingNoteTarget["focus"] | null;
}) {
	const { follow } = useWorkspaceInteraction();
	const definitionSelection = useSegmentSelection(visitorId);
	const convex = useConvex();
	const updatePersonalAnnotation = useMutation(
		api.personalAnnotations.update,
	);
	const ensureKnowledge = useMutation(
		api.knowledgeGeneration.ensureForReading,
	);
	const followAlternative = useAction(
		api.orchestration.followGrammaticalAlternative,
	);
	const alternativeMutation = useReactQueryMutation({
		mutationFn: async (readingKey: string) => {
			const readingId = await followAlternative({
				sourceReadingId: note.target.readingId,
				readingKey,
			});
			follow({ kind: "Reading", readingId });
		},
	});
	const personalAnnotationMutation = useReactQueryMutation({
		mutationFn: updatePersonalAnnotation,
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
	const attestationId = note.sourceContexts.page[0]?.attestationId;
	useEffect(() => {
		if (!attestationId) return;
		void ensureKnowledge({
			visitorId,
			readingId: note.target.readingId,
			attestationId,
		});
	}, [
		attestationId,
		ensureKnowledge,
		knowledgeSettings.translations.en,
		knowledgeSettings.translations.ru,
		note.target.readingId,
		visitorId,
	]);

	async function savePersonalAnnotation(text: string) {
		await personalAnnotationMutation.mutateAsync({
			visitorId,
			readingId: note.target.readingId,
			text,
		});
	}
	const capabilities = {
		grammaticalAlternatives: {
			follow: (readingKey: string) =>
				alternativeMutation.mutateAsync(readingKey),
			pending: alternativeMutation.isPending,
			error: alternativeMutation.error
				? "Could not open this form. Please retry."
				: null,
		},
		presentation,
		knowledgeSettings,
		sourceContexts: {
			items: pagination.note.sourceContexts.page,
			hasMore: pagination.hasMore,
			isLoading: pagination.isLoading,
			error: pagination.error,
			loadMore: pagination.hasMore ? pagination.loadMore : null,
		},
		personalAnnotation: {
			isSaving: personalAnnotationMutation.isPending,
			error: personalAnnotationMutation.error
				? mutationMessage(personalAnnotationMutation.error)
				: null,
			save: savePersonalAnnotation,
		},
		// Only a Sheet reads the definition as a Sentence; a Card keeps prose.
		...(presentation === "Sheet"
			? {
					definition: {
						focus:
							focus?.kind === "Definition"
								? { attestationId: focus.attestationId }
								: null,
						selectedSegmentKey:
							definitionSelection.selectedSegmentKey,
						error: definitionSelection.error,
						selectSegment: definitionSelection.select,
					},
				}
			: {}),
		follow,
	};

	return renderNote({ noteData: pagination.note, capabilities });
}

function mutationMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Knowledge update failed.";
}
