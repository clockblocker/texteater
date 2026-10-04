import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useAnonymousVisitorId } from "@/hooks/use-anonymous-visitor";
import {
	renderApplicationSubject,
	subjectLabel,
} from "@/views/subject-presentation";
import type { SubjectRenderer, SubjectView } from "@/workspace/compass/subject";
import { api } from "../../convex/_generated/api";
import { HeadingSkeleton, type NotePart, NotePartProvider } from "./note-part";
import {
	type TextSubjectTarget,
	type WorkspaceSubject,
	workspaceSubjectFor,
} from "./sheet-workspace";
import {
	type WorkspaceCardTarget,
	type WorkspaceInteraction,
	WorkspaceInteractionProvider,
} from "./workspace-controller";

/**
 * How tf-demo's Subjects render in the Compass: a Text through the reader, a
 * Note through the Notes renderers (tf-demo ADR 0006), each split into the
 * Heading Block the renderer places as a handle and the Body it clips or
 * scrolls. The views keep asking the workspace through
 * `WorkspaceInteraction`; here it is bound to the Sheet or Card they are
 * drawn in.
 */

/** A Text reads on the Notes page's column, `--container-note`. */
const TEXT_COLUMN_REM = 48;
/** A Note's Blocks lay out on a wider column (accepted for real Notes). */
const NOTE_COLUMN_REM = 50;

export const applicationRenderer: SubjectRenderer<WorkspaceSubject> = {
	label: subjectLabel,
	columnRem: (subject) =>
		subject.kind === "Text" ? TEXT_COLUMN_REM : NOTE_COLUMN_REM,
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
	const card = view.form === "card";
	return (
		<WorkspaceInteractionProvider
			interaction={interaction}
			dealtSelection={view.lit}
		>
			<NotePartProvider value={part}>
				{part === "heading" ? (
					subject.kind === "Text" ? (
						<TextHeading target={subject.target} />
					) : (
						renderApplicationSubject(
							subject,
							card ? "Card" : "Sheet",
						)
					)
				) : subject.kind === "Text" ? (
					renderApplicationSubject(subject, card ? "Card" : "Sheet")
				) : (
					/* a Card's Blocks are inert until it is a Sheet (#485), so a
					   press anywhere on it lifts it; a Sheet's Heading is its
					   bar, so its first Block keeps only the air under one */
					<div
						inert={card}
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

function dealtCard({ key, target, presentationContext }: WorkspaceCardTarget) {
	return { key, subject: workspaceSubjectFor(target, presentationContext) };
}

/** A Text's Heading: what the Library called it, or its opening words. */
function TextHeading({ target }: { target: TextSubjectTarget }) {
	const visitorId = useAnonymousVisitorId();
	const textQuery = useQuery({
		...convexQuery(api.textViews.get, { textId: target.textId, visitorId }),
		enabled: target.title === undefined,
	});
	const title =
		target.title ?? textQuery.data?.sourceText.trim().split("\n")[0];
	if (title === undefined) return <HeadingSkeleton />;
	return <span className="min-w-0 truncate font-serif">{title}</span>;
}
