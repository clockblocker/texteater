import { convexQuery } from "@convex-dev/react-query";
import {
	type QueryClient,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { Button, DensityScope } from "lego";
import { useEffect } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import {
	ResolvingReadingHeading,
	resolvingAttestationNoteParts,
} from "@/notes";
import { NotFoundView } from "@/views/not-found-view";
import {
	type ResolutionNote,
	resolutionDeckCards,
} from "@/views/resolution-deck";
import {
	ResolvingReadingNote,
	resolvingWords,
} from "@/views/resolving-reading-note";
import { routeNoteQueryArgs } from "@/views/route-note-view";
import {
	PlacedNoteSkeleton,
	useNotePart,
	useOwnsNoteEffects,
} from "@/workspace/note-part";
import {
	useWorkspaceInteraction,
	type WorkspaceCardTarget,
} from "@/workspace/workspace-controller";
import {
	activeAnalysisKeyOf,
	type ResolutionStepTarget,
	type UnitRoute,
} from "@/workspace/workspace-subject";
import { api } from "../../convex/_generated/api";

type Presentation = "Card" | "Sheet";

export function ResolutionStepNoteView({
	target,
	presentation = "Sheet",
	unitRoute,
}: {
	target: ResolutionStepTarget;
	presentation?: Presentation;
	/** The clicked unit's route, from the Segment Selection that dealt this Card. */
	unitRoute?: UnitRoute;
}) {
	const visitorId = useAnonymousVisitorId();
	const retryResolution = useConvexMutation(
		api.resolutionSessions.retryResolution,
	);
	const noteQuery = useQuery(
		convexQuery(api.resolutionSessions.getResolutionNote, {
			requestId: target.requestId,
		}),
	);
	const note: ResolutionNote | null = noteQuery.data ?? null;
	useResolutionDeck(note);

	if (!noteQuery.isPending && !note) {
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
			requestId={target.requestId}
			presentation={presentation}
			note={note}
			unitRoute={unitRoute}
			onRetry={() =>
				retryResolution({ requestId: target.requestId, visitorId })
			}
		/>
	);
}

/**
 * The Deck holding this Resolution's Cards keeps up with it, Card by Card.
 * At commit the stored Notes are loaded before they are dealt, so the Lemma
 * and Surface arrive filled in and the steps hand over without their bones
 * flashing.
 */
function useResolutionDeck(note: ResolutionNote | null) {
	const { presentCards } = useWorkspaceInteraction();
	const ownsEffects = useOwnsNoteEffects();
	const queryClient = useQueryClient();
	const visitorId = useAnonymousVisitorId();
	useEffect(() => {
		if (!note || !ownsEffects) return;
		const cards = resolutionDeckCards(note);
		let current = true;
		void Promise.all(
			cards.map((card) => prefetchCardNote(queryClient, visitorId, card)),
		).then(() => {
			if (current) presentCards(cards);
		});
		return () => {
			current = false;
		};
	}, [note, ownsEffects, presentCards, queryClient, visitorId]);
}

/** Loads the stored Note a Card will show, under the query its view asks. */
function prefetchCardNote(
	queryClient: QueryClient,
	visitorId: string,
	{ target, presentationContext }: WorkspaceCardTarget,
): Promise<void> {
	switch (target.kind) {
		case "Reading":
			return queryClient.prefetchQuery(
				convexQuery(api.readingNotes.get, {
					readingId: target.readingId,
					visitorId,
				}),
			);
		case "Lemma":
		case "Surface":
		case "Attestation":
			return queryClient.prefetchQuery(
				convexQuery(api.routeNotes.get, {
					...routeNoteQueryArgs(
						target,
						activeAnalysisKeyOf(presentationContext),
					),
					visitorId,
				}),
			);
		default:
			return Promise.resolve();
	}
}

/** Whether the Session ended without an occurrence: Unresolved, or failed for good. */
function failedSession(note: ResolutionNote): boolean {
	return (
		note.lifecycle.state === "Terminal" &&
		note.lifecycle.outcome !== "Complete"
	);
}

/**
 * A step of a running Resolution, each the eventual Note itself, fed what
 * the Session knows so far. The Reading step also shows a Session that
 * ended without an occurrence.
 */
export function ResolutionStepNoteFrame({
	stepKind,
	requestId,
	presentation,
	note,
	unitRoute,
	onRetry,
}: {
	stepKind: ResolutionStepTarget["stepKind"];
	requestId: string;
	presentation: Presentation;
	/** Null until the Session's first result arrives. */
	note: ResolutionNote | null;
	unitRoute?: UnitRoute;
	onRetry?: () => Promise<unknown>;
}) {
	if (stepKind === "Attestation")
		return (
			<ResolvingAttestationNote note={note} presentation={presentation} />
		);
	if (note && failedSession(note))
		return (
			<ResolutionFailure
				note={note}
				presentation={presentation}
				onRetry={onRetry}
			/>
		);
	return (
		<ResolvingReadingNote
			resolving={{
				requestId,
				note,
				...(unitRoute ? { unitRoute } : {}),
			}}
			presentation={presentation}
		/>
	);
}

/** The Attestation step: the clicked words and their sentence, what they read as on the way. */
function ResolvingAttestationNote({
	note,
	presentation,
}: {
	note: ResolutionNote | null;
	presentation: Presentation;
}) {
	const part = useNotePart();
	const { follow } = useWorkspaceInteraction();
	if (!note)
		return (
			<PlacedNoteSkeleton
				kind="Attestation"
				presentation={presentation}
			/>
		);
	const parts = resolvingAttestationNoteParts({
		attested: resolvingWords(note),
		segments: note.source.segments,
		memberSegmentIndices: note.source.memberSegmentIndices,
		settled: failedSession(note),
		presentation,
		follow: () =>
			follow({
				kind: "Text",
				textId: note.route.textId,
				title: note.source.textTitle,
			}),
	});
	if (part === "heading") return parts.heading;
	return part === "body" ? parts.body : parts.note;
}

/**
 * A Session that ended without an occurrence, in its Reading Card: the
 * clicked words, still, and why. A Session that failed for good can be
 * retried; an Unresolved unit cannot.
 */
function ResolutionFailure({
	note,
	presentation,
	onRetry,
}: {
	note: ResolutionNote;
	presentation: Presentation;
	onRetry?: () => Promise<unknown>;
}) {
	const part = useNotePart();
	const { lifecycle } = note;
	const heading = (
		<ResolvingReadingHeading
			words={resolvingWords(note)}
			resolving={false}
		/>
	);
	if (part === "heading") return heading;
	return (
		<DensityScope
			density={presentation === "Card" ? "compact" : "comfortable"}
			data-note-presentation={presentation}
			className="min-h-full bg-paper text-base text-ink compact:text-sm"
		>
			<div className="mx-auto flex w-full max-w-note flex-col gap-3 px-note-gutter pt-note-top pb-note-top compact:p-3.5">
				{part === null ? heading : null}
				{lifecycle.state === "Terminal" &&
				lifecycle.outcome === "PermanentFailure" ? (
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
				) : (
					<p className="text-sm text-ink-muted" role="status">
						{note.unit
							? "This unit could not be resolved."
							: "This Segment could not be resolved."}
					</p>
				)}
			</div>
		</DensityScope>
	);
}
