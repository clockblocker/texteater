import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { Button } from "lego";
import { useEffect } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import { NotFoundView } from "@/views/not-found-view";
import { resolutionDeckCards } from "@/views/resolution-deck";
import { ResolvingReadingNote } from "@/views/resolving-reading-note";
import {
	PlacedNoteSkeleton,
	useNotePart,
	useOwnsNoteEffects,
} from "@/workspace/note-part";
import type { ResolutionStepTarget } from "@/workspace/sheet-workspace";
import { useWorkspaceInteraction } from "@/workspace/workspace-controller";
import { api } from "../../convex/_generated/api";
import type { ResolutionNote } from "../../convex/model/resolutionSessions";
import type { ResolutionTarget } from "../../shared/navigation";

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
	const noteQuery = useQuery(
		convexQuery(api.resolutionSessions.getResolutionNote, {
			requestId: target.requestId,
		}),
	);
	const note: ResolutionNote | null = noteQuery.data ?? null;

	useResolutionDeck(note, presentCards);

	if (noteQuery.isPending)
		return (
			<PlacedNoteSkeleton
				kind="Attestation"
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
	const noteQuery = useQuery(
		convexQuery(api.resolutionSessions.getResolutionNote, {
			requestId: target.requestId,
		}),
	);
	const note: ResolutionNote | null = noteQuery.data ?? null;
	useResolutionDeck(note, presentCards);

	if (noteQuery.isPending)
		return (
			<PlacedNoteSkeleton
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

/** The Deck holding this Resolution's Cards keeps up with it, Card by Card. */
function useResolutionDeck(
	note: ResolutionNote | null,
	presentCards: ReturnType<typeof useWorkspaceInteraction>["presentCards"],
) {
	const ownsEffects = useOwnsNoteEffects();
	useEffect(() => {
		if (!note || !ownsEffects) return;
		presentCards(resolutionDeckCards(note));
	}, [note, ownsEffects, presentCards]);
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
	const part = useNotePart();
	// A click shows the unit it selected until Grammar resolves, and keeps
	// showing it when the unit stays Unresolved (#848, #886).
	const unit =
		lifecycle.state === "Active" || lifecycle.outcome === "Unresolved"
			? note.unit
			: undefined;
	if (
		!unit &&
		(lifecycle.state === "Active" || lifecycle.outcome === "Complete")
	) {
		return (
			<PlacedNoteSkeleton
				kind="Attestation"
				presentation={presentation}
			/>
		);
	}
	const title = resolutionTitle(note);
	if (part === "heading")
		return <span className="min-w-0 truncate">{title}</span>;
	if (unit) return <UnitCard note={note} unit={unit} />;
	if (lifecycle.state === "Active" || lifecycle.outcome === "Complete")
		return null;
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
 * What a settled Resolution Note is titled: the unit it selected while that
 * is what it shows, else its Reading. A Foreign Reading has no Emoji
 * Description (ADR 0045).
 */
function resolutionTitle(note: ResolutionNote): string {
	const { lifecycle } = note;
	if (
		note.unit &&
		(lifecycle.state === "Active" || lifecycle.outcome === "Unresolved")
	)
		return unitWords(note.source.segments, note.unit.segments);
	return note.reading
		? [note.reading.emojiDescription, note.reading.canonicalForm]
				.filter(Boolean)
				.join(" ")
		: (note.grammar?.canonicalForm ?? note.route.selectedSegment);
}

type StoredUnit = NonNullable<ResolutionNote["unit"]>;
type UnitRoute = Exclude<StoredUnit["route"], "Unresolved">;

/** `Lexeme · VERB`; a Family with one Kind is named once. */
function routeLabel(route: StoredUnit["route"]): string {
	if (route === "Unresolved") return "Unresolved";
	return route.family === route.kind
		? route.family
		: `${route.family} · ${route.kind}`;
}

/** The unit's words in order; a gap between members reads as an ellipsis. */
function unitWords(
	segments: ResolutionNote["source"]["segments"],
	members: readonly number[],
): string {
	return members
		.map((index, position) => {
			const previous = members[position - 1];
			const text = segments[index]?.text ?? "";
			if (previous === undefined) return text;
			const between = segments.slice(previous + 1, index);
			if (between.length === 0) return text;
			return between.every(({ kind }) => kind === "Whitespace")
				? ` ${text}`
				: ` … ${text}`;
		})
		.join("");
}

/**
 * The unit a click selected, its route and any route variants: what the
 * Resolution Card shows while Grammar runs, and what an Unresolved click
 * settles on (#848, #886).
 */
function UnitCard({ note, unit }: { note: ResolutionNote; unit: StoredUnit }) {
	const variants: readonly UnitRoute[] = (unit.variants ?? []).filter(
		(variant) =>
			unit.route === "Unresolved" ||
			routeLabel(variant) !== routeLabel(unit.route),
	);
	return (
		<div className="min-h-full bg-paper px-note-gutter pt-note-top compact:p-3.5">
			<div className="mx-auto flex w-full max-w-note flex-col gap-3">
				<h1 className="text-xl font-semibold tracking-tight text-balance">
					{unitWords(note.source.segments, unit.segments)}
				</h1>
				<dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
					<dt className="text-ink-muted">Route</dt>
					<dd>{routeLabel(unit.route)}</dd>
					{variants.length > 0 ? (
						<>
							<dt className="text-ink-muted">Also possible</dt>
							<dd>{variants.map(routeLabel).join(", ")}</dd>
						</>
					) : null}
				</dl>
				<p className="text-xs text-ink-muted" role="status">
					{note.lifecycle.state === "Active"
						? "Resolving this unit…"
						: "This unit could not be resolved."}
				</p>
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
	return <PlacedNoteSkeleton kind={stepKind} presentation={presentation} />;
}
