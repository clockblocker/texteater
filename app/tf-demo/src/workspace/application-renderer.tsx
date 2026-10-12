import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import {
	renderApplicationSubject,
	subjectLabel,
} from "@/views/subject-presentation";
import type { SubjectRenderer, SubjectView } from "@/workspace/compass/subject";
import { api } from "../../convex/_generated/api";
import type { SectionTarget } from "../../shared/navigation";
import { scrollTitle } from "../../shared/scroll-title";
import { HeadingSkeleton, type NotePart, NotePartProvider } from "./note-part";
import {
	type GroundPlace,
	type WorkspaceCardTarget,
	type WorkspaceInteraction,
	WorkspaceInteractionProvider,
} from "./workspace-controller";
import {
	type ScrollSubjectTarget,
	type WorkspaceSubject,
	type WorkspaceTarget,
	workspaceSubjectFor,
} from "./workspace-subject";

/**
 * How tf-demo's Subjects render in the Compass: a Section as its Codex, a
 * Scroll through the reader, a Note through the Notes renderers (tf-demo ADR 0006), each split into the
 * Heading Block the renderer places as a handle and the Body it clips or
 * scrolls. The views keep asking the workspace through
 * `WorkspaceInteraction`; here it is bound to the Sheet or Card they are
 * drawn in.
 */

/** A Scroll reads on the Notes page's column, `--container-note`. */
const SCROLL_COLUMN_REM = 48;
/** A Note's Blocks lay out on a wider column (accepted for real Notes). */
const NOTE_COLUMN_REM = 50;

export const applicationRenderer: SubjectRenderer<WorkspaceSubject> = {
	label: subjectLabel,
	columnRem: (subject) =>
		subject.kind === "Note" ? NOTE_COLUMN_REM : SCROLL_COLUMN_REM,
	render: (subject, view, part) => (
		<PlacedSubject subject={subject} view={view} part={part} />
	),
};

function PlacedSubject({
	subject,
	view,
	part,
}: {
	subject: WorkspaceSubject;
	view: SubjectView<WorkspaceSubject>;
	part: NotePart;
}) {
	const interaction = useInteractionOf(view);
	const place = usePlaceOf(view);
	const card = view.form === "card";
	return (
		<WorkspaceInteractionProvider
			interaction={interaction}
			dealtSelection={view.lit}
			place={place}
		>
			<NotePartProvider value={part}>
				{part === "heading" ? (
					subject.kind === "Scroll" ? (
						<ScrollHeading target={subject.target} />
					) : subject.kind === "Section" ? (
						<SectionHeading target={subject.target} />
					) : (
						renderApplicationSubject(
							subject,
							card ? "Card" : "Sheet",
						)
					)
				) : subject.kind !== "Note" ? (
					renderApplicationSubject(subject, card ? "Card" : "Sheet")
				) : (
					/* a Sheet's Heading is its bar, so its first Block keeps
					   only the air under one */
					<div
						className={
							card
								? ""
								: "[&_[data-note-presentation]>article]:pt-0"
						}
					>
						{renderApplicationSubject(
							subject,
							card ? "Card" : "Sheet",
						)}
					</div>
				)}
			</NotePartProvider>
		</WorkspaceInteractionProvider>
	);
}

/**
 * The workspace as a view asks it, through what the renderer hands this
 * Presentation. The view handed over is new every render; the interaction is
 * stable, so effects that depend on it, such as a Resolution keeping its Deck
 * up to date, run when their data changes and not on every frame.
 */
function useInteractionOf(
	view: SubjectView<WorkspaceSubject>,
): WorkspaceInteraction {
	const latest = useRef(view);
	useLayoutEffect(() => {
		latest.current = view;
	});
	return useMemo(
		() => ({
			follow: (target, presentationContext) =>
				latest.current.follow(
					workspaceSubjectFor(target, presentationContext),
				),
			presentCards: (cards, options) => {
				const dealt = cards.map(dealtCard);
				const anchor = options?.anchor;
				if (anchor instanceof HTMLElement && options?.selection)
					latest.current.deal(options.selection, dealt, anchor);
				else latest.current.reconcile(dealt);
			},
		}),
		[],
	);
}

/**
 * Where this Presentation sits, as a view asks it: a Ground or not, and a
 * Rooted Ground's line, which its Codex or its next walks.
 */
function usePlaceOf(view: SubjectView<WorkspaceSubject>): GroundPlace {
	const latest = useRef(view);
	useLayoutEffect(() => {
		latest.current = view;
	});
	const walk = useCallback<GroundPlace["walk"]>(
		(keep, to) =>
			latest.current.walk(
				keep,
				to.map((target) => workspaceSubjectFor(target)),
			),
		[],
	);
	const ground = view.ground && view.form === "sheet";
	const line = view.line?.map((subject) => subject.target) ?? null;
	const lineKey = line?.map(lineRungKey).join("/") ?? null;
	/* the line is a fresh array every render; it is compared by its rungs */
	return useMemo(() => ({ ground, line, walk }), [ground, lineKey, walk]);
}

function lineRungKey(target: WorkspaceTarget): string {
	return target.kind === "Section"
		? `Section:${target.sectionId}`
		: target.kind === "Scroll"
			? `Scroll:${target.scrollId}`
			: target.kind;
}

function dealtCard({ key, target, presentationContext }: WorkspaceCardTarget) {
	return { key, subject: workspaceSubjectFor(target, presentationContext) };
}

/** A Section's Heading: what the Library or its Codex calls it. */
function SectionHeading({ target }: { target: SectionTarget }) {
	const visitorId = useAnonymousVisitorId();
	const codexQuery = useQuery({
		...convexQuery(api.library.codex, {
			sectionId: target.sectionId,
			visitorId,
		}),
		enabled: target.title === undefined,
	});
	const title = target.title ?? codexQuery.data?.title;
	if (title === undefined) return <HeadingSkeleton />;
	return <span className="min-w-0 truncate font-serif">{title}</span>;
}

/** A Scroll's Heading: what the Library calls it. */
function ScrollHeading({ target }: { target: ScrollSubjectTarget }) {
	const visitorId = useAnonymousVisitorId();
	const scrollQuery = useQuery({
		...convexQuery(api.scrollViews.get, {
			scrollId: target.scrollId,
			visitorId,
		}),
		enabled: target.title === undefined,
	});
	const title =
		target.title ??
		(scrollQuery.data ? scrollTitle(scrollQuery.data) : undefined);
	if (title === undefined) return <HeadingSkeleton />;
	return <span className="min-w-0 truncate font-serif">{title}</span>;
}
