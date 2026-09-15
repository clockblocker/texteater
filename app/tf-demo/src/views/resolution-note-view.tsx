import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { Button } from "lego";
import { useEffect } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import type { ResolutionTarget } from "@/lib/navigation";
import { NotFoundView } from "@/views/not-found-view";
import { renderNoteSkeleton } from "@/views/note-skeletons";
import { resolutionDeckCards } from "@/views/resolution-deck";
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
		return renderNoteSkeleton("Attestation", presentation);
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
		return renderNoteSkeleton(target.stepKind, presentation);
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

export function completionTarget(note: ResolutionNote | null) {
	return note?.terminal?.kind === "Complete" ? note.terminal.target : null;
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
	if (note.activity !== "Terminal" || note.terminal?.kind === "Complete") {
		return renderNoteSkeleton("Attestation", presentation);
	}

	const title = note.reading
		? `${note.reading.emojiDescription} ${note.reading.canonicalForm}`
		: (note.grammar?.canonicalForm ?? note.route.selectedSegment);
	return (
		<div className="min-h-full bg-paper px-note-gutter pt-note-top compact:p-3.5">
			<div className="mx-auto flex w-full max-w-note flex-col gap-5">
				<h1 className="text-xl font-semibold tracking-tight">
					{title}
				</h1>
				{note.terminal?.kind === "Unresolved" ? (
					<p className="text-sm text-muted-foreground" role="status">
						This Segment could not be resolved. This Resolution URL
						remains available.
					</p>
				) : note.terminal?.kind === "PermanentFailure" ? (
					<div className="flex flex-col items-start gap-3">
						<p className="text-sm text-destructive" role="alert">
							{note.terminal.message}
						</p>
						<p className="text-xs text-muted-foreground">
							Diagnostic reference: {note.terminal.diagnosticId}
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
				) : null}
			</div>
		</div>
	);
}

export function ResolutionStepNoteFrame({
	stepKind,
	presentation,
}: {
	stepKind: ResolutionStepTarget["stepKind"];
	presentation: Presentation;
}) {
	return renderNoteSkeleton(stepKind, presentation);
}
