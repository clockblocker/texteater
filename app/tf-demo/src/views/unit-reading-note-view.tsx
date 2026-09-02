import { convexQuery } from "@convex-dev/react-query";
import {
	useQuery,
	useMutation as useReactQueryMutation,
} from "@tanstack/react-query";
import {
	useAction,
	useConvex,
	useMutation as useConvexMutation,
} from "convex/react";
import type { KnowledgeSettings } from "dumrel";
import { ListOrderedIcon } from "lucide-react";
import { useCallback } from "react";

import { ReadingBlockLayoutEditor } from "@/components/reading-block-layout-editor";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import type { UnitReadingNoteTarget } from "@/lib/navigation";
import {
	normalizeReadingDefinition,
	readingDefinitionChange,
} from "@/lib/reading-definition";
import { renderNote } from "@/notes";
import { usePaginatedNoteLoading } from "@/notes/paginated-note-loading";
import type {
	ReadingNoteData,
	ReadingNotePresentationCapabilities,
} from "@/notes/reading";
import { NotFoundView } from "@/views/not-found-view";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import {
	availableReadingBlocksForRoute,
	type ReadingBlockRoute,
} from "../../shared/reading-block-layout";

export type UnitReadingNote = ReadingNoteData;

export function UnitReadingNoteView({
	target,
}: {
	target: UnitReadingNoteTarget;
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
	const route =
		noteQuery.data?.kind === "UnitReadingNote"
			? readingBlockRoute(noteQuery.data)
			: null;
	if (
		noteQuery.data?.kind !== "UnitReadingNote" ||
		!settingsQuery.data ||
		!route
	) {
		return (
			<NotFoundView
				title="Reading note not found"
				description="This Unit Reading Note does not exist, was removed, or its Reading is not a supported Unit family."
			/>
		);
	}

	return (
		<ReadingNoteContainer
			key={noteQuery.data.target.readingId}
			visitorId={visitorId}
			note={noteQuery.data}
			knowledgeSettings={settingsQuery.data}
			route={route}
		/>
	);
}

function ReadingNoteContainer({
	visitorId,
	note,
	knowledgeSettings,
	route,
}: {
	visitorId: string;
	note: ReadingNoteData;
	knowledgeSettings: KnowledgeSettings;
	route: ReadingBlockRoute;
}) {
	const { follow } = useWorkspaceInteraction();
	const convex = useConvex();
	const layoutQuery = useQuery({
		...convexQuery(api.readingBlockLayouts.getFamilyKind, {
			visitorId,
			route,
		}),
		gcTime: 10_000,
	});
	const setOrder = useConvexMutation(
		api.readingBlockLayouts.setFamilyKindBlockOrder,
	);
	const setVisibility = useConvexMutation(
		api.readingBlockLayouts.setFamilyKindBlockVisibility,
	);
	const applyKnowledgeChangeAction = useAction(
		api.orchestration.applyReadingKnowledgeChange,
	);
	const definitionMutation = useReactQueryMutation({
		mutationFn: applyKnowledgeChangeAction,
	});
	const loadSourceContextPage = useCallback(
		async (cursor: string): Promise<ReadingNoteData | null> => {
			const next = await convex.query(api.readingNotes.get, {
				readingId: note.target.readingId,
				visitorId,
				contextCursor: cursor,
			});
			return next?.kind === "UnitReadingNote" ? next : null;
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
	if (layoutQuery.isPending) return <ReadingNoteSkeleton />;
	if (!layoutQuery.data) {
		return <ReadingLayoutLoadFailure error={layoutQuery.error} />;
	}

	const capabilities: ReadingNotePresentationCapabilities = {
		blockLayout: {
			order: layoutQuery.data.order,
			hidden: new Set(layoutQuery.data.hidden),
		},
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
		<Dialog>
			<div className="flex flex-1 flex-col bg-background">
				<div className="border-b bg-muted/20 px-4 py-2 sm:px-6">
					<div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
						<p className="min-w-0 truncate text-xs text-muted-foreground">
							Reading layout · German · {route.family} ·{" "}
							{route.kind}
						</p>
						<DialogTrigger
							render={<Button variant="outline" size="sm" />}
						>
							<ListOrderedIcon />
							Edit layout
						</DialogTrigger>
					</div>
				</div>
				{renderNote(pagination.note, capabilities)}
			</div>
			<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						Layout for {route.family} · {route.kind}
					</DialogTitle>
					<DialogDescription>
						Changes apply to every German {route.family} ·{" "}
						{route.kind} Reading note in this browser. Other Reading
						routes keep their own layout.
					</DialogDescription>
				</DialogHeader>
				<ReadingBlockLayoutEditor
					layout={layoutQuery.data}
					onOrderChange={(order) =>
						setOrder({
							visitorId,
							route,
							order: [...order],
						})
					}
					onVisibilityChange={(blockKind, visible) =>
						setVisibility({
							visitorId,
							route,
							blockKind,
							visible,
						})
					}
				/>
			</DialogContent>
		</Dialog>
	);
}

export function readingDefinitionMutationArgs(
	note: ReadingNoteData,
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

function ReadingLayoutLoadFailure({ error }: { error: unknown }) {
	return (
		<div className="flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto w-full max-w-5xl">
				<p className="text-sm text-destructive" role="alert">
					{error instanceof Error
						? error.message
						: "Reading layout could not be loaded."}
				</p>
			</div>
		</div>
	);
}

function readingBlockRoute(note: ReadingNoteData): ReadingBlockRoute | null {
	const lemma = note.reading.lemma;
	if (lemma.language !== "de") return null;
	const route: ReadingBlockRoute = {
		targetLanguage: "de",
		family: lemma.family,
		kind: lemma.kind,
	};
	return availableReadingBlocksForRoute(route) ? route : null;
}

function mutationMessage(error: unknown): string {
	return error instanceof Error ? error.message : "Knowledge update failed.";
}
