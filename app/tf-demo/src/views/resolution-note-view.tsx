import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { Button } from "lego";
import { useEffect } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import type { ResolutionTarget } from "@/lib/navigation";
import { NotFoundView } from "@/views/not-found-view";
import { NoteSkeletonFor } from "@/views/note-skeletons";
import { resolutionDeckCards } from "@/views/resolution-deck";
import { ResolvingReadingNote } from "@/views/resolving-reading-note";
import type { ResolutionStepTarget } from "@/workspace/sheet-workspace";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import type { ResolutionNote } from "../../convex/model/resolutionSessions";

type Presentation = "Card" | "Sheet";

export function ResolutionNoteView({
	target,
	presentation = "Sheet",
}: {
	target: ResolutionTarget;
	presentation?: Presentation;
}) {
	const { presentCards } = useWorkspaceInteraction();
	const visitorId = useAnonymousVisitorId();
	const retryResolution = useConvexMutation(
		api.resolutionSessions.retryResolution,
	);
	const noteQuery = useQuery({
		...convexQuery(api.resolutionSessions.getResolutionNote, {
			requestId: target.requestId,
		}),
		gcTime: 10_000,
	});
	const note: ResolutionNote | null = noteQuery.data ?? null;

	useResolutionDeck(note, presentCards);

	if (noteQuery.isPending)
		return (
			<NoteSkeletonFor kind="Attestation" presentation={presentation} />
		);
	if (!note) {
		return (
			<NotFoundView
				title="Resolution not found"
				description="This Resolution Session does not exist or is no longer active."
			/>
		);
	}
	return (
		<ResolutionNoteFrame
			note={note}
			presentation={presentation}
			onRetry={() =>
				retryResolution({ requestId: target.requestId, visitorId })
			}
		/>
	);
}

export function ResolutionStepNoteView({
	target,
	presentation = "Sheet",
}: {
	target: ResolutionStepTarget;
	presentation?: Presentation;
}) {
	const { presentCards } = useWorkspaceInteraction();
	const noteQuery = useQuery({
		...convexQuery(api.resolutionSessions.getResolutionNote, {
			requestId: target.requestId,
		}),
		gcTime: 10_000,
	});
	const note: ResolutionNote | null = noteQuery.data ?? null;
	useResolutionDeck(note, presentCards);

	if (noteQuery.isPending)
		return (
			<NoteSkeletonFor
				kind={target.stepKind}
				presentation={presentation}
			/>
		);
	if (!note) {
		return (
			<NotFoundView
				title="Resolution not found"
				description="This Resolution Session does not exist or is no longer active."
			/>
		);
	}
	return (
		<ResolutionStepNoteFrame
			stepKind={target.stepKind}
			presentation={presentation}
			note={note}
		/>
	);
}

function useResolutionDeck(
	note: ResolutionNote | null,
	presentCards: ReturnType<typeof useWorkspaceInteraction>["presentCards"],
) {
	useEffect(() => {
		if (!note) return;
		presentCards(resolutionDeckCards(note));
	}, [note, presentCards]);
}

export function ResolutionNoteFrame({
	note,
	presentation,
	onRetry,
}: {
	note: ResolutionNote;
	presentation: Presentation;
	onRetry?: () => Promise<unknown>;
}) {
	const { lifecycle } = note;
	if (lifecycle.state === "Active" || lifecycle.outcome === "Complete") {
		return (
			<NoteSkeletonFor kind="Attestation" presentation={presentation} />
		);
	}

	const title = note.reading
		? `${note.reading.emojiDescription} ${note.reading.canonicalForm}`
		: (note.grammar?.canonicalForm ?? note.route.selectedSegment);
	return (
		<div className="min-h-full bg-paper px-note-gutter pt-note-top compact:p-3.5">
			<div className="mx-auto flex w-full max-w-note flex-col gap-5">
				<h1 className="text-xl font-semibold tracking-tight text-balance">
					{title}
				</h1>
				{lifecycle.outcome === "Unresolved" ? (
					<p className="text-sm text-ink-muted" role="status">
						This Segment could not be resolved. This Resolution URL
						remains available.
					</p>
				) : (
					<div className="flex flex-col items-start gap-3">
						<p className="text-sm text-destructive" role="alert">
							{lifecycle.message}
						</p>
						<p className="text-xs text-ink-muted">
							Diagnostic reference: {lifecycle.diagnosticId}
						</p>
						{onRetry ? (
							<Button
								type="button"
								onClick={() => void onRetry()}
							>
								Retry resolution
							</Button>
						) : null}
					</div>
				)}
			</div>
		</div>
	);
}

/**
 * A step of a running Resolution. The Reading step is the eventual Reading
 * Note itself, fed what the Session knows so far; the other steps keep the
 * skeleton of the Note they become.
 */
export function ResolutionStepNoteFrame({
	stepKind,
	presentation,
	note,
}: {
	stepKind: ResolutionStepTarget["stepKind"];
	presentation: Presentation;
	note?: ResolutionNote;
}) {
	if (stepKind === "Reading" && note?.grammar)
		return <ResolvingReadingNote note={note} presentation={presentation} />;
	return <NoteSkeletonFor kind={stepKind} presentation={presentation} />;
}
