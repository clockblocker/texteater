import type { ReactNode } from "react";
import type { NoteLink } from "./dummy";
import { sheetColumn } from "./geometry";
import {
	COVER_GUTTER_REM,
	SheetChrome,
	useHeadingDesign,
} from "./heading-design";
import type { CoverBack, Subject } from "./model";
import { BAR_REM } from "./motion-spec";
import { SheetTitle } from "./note-view";
import { PortedTitle, usePortedFollow, usePortedReading } from "./real-note";

/** A Pane's own chrome: the Ground's lists and the Pane bar's face. */

/** The Menu's and the Library's column, gutters included, as a Text's. */
export const GROUND_LIST_WIDTH = "43rem";

/** A Menu or a Library rung: a list the Ground walks by tapping. */
export function GroundList({
	title,
	items,
	onPick,
}: {
	title: string;
	items: readonly { readonly key: string; readonly label: string }[];
	onPick: (key: string) => void;
}) {
	return (
		<div
			className="h-full overflow-auto"
			style={{ paddingTop: `${BAR_REM.toString()}rem` }}
		>
			<div
				className="mx-auto w-full pt-10 pb-12"
				style={{
					maxWidth: GROUND_LIST_WIDTH,
					paddingInline: `${COVER_GUTTER_REM.toString()}rem`,
				}}
			>
				<h2 className="mb-5 font-sans text-[0.68rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
					{title}
				</h2>
				<ul className="flex flex-col gap-1">
					{items.map((item) => (
						<li key={item.key}>
							<button
								type="button"
								data-ground-item={item.key}
								onClick={() => onPick(item.key)}
								className="-mx-3 w-[calc(100%+1.5rem)] rounded-md px-3 py-2 text-left font-serif text-[1.15rem] text-ink hover:bg-raised"
							>
								{item.label}
							</button>
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

/**
 * A Pane bar's face: the Ground's chrome, laid out as a Cover's Heading.
 * A Rooted Pane shows its ← and its trail; a Floating Pane its ×, and its
 * Ground's title, the real one when the Ground is a ported Note.
 */
export function PaneBarFace({
	subject,
	titled,
	width,
	back,
	clear,
	onFollow,
	children,
}: {
	/** The Ground's Subject when it is a Sheet: its column is the bar's. */
	subject: Subject | null;
	/** Shows the Ground's title; otherwise the trail. */
	titled: boolean;
	/** The column when the Ground is a list rather than a Sheet. */
	width: string | null;
	back: CoverBack | null;
	clear: CoverBack | null;
	onFollow: (link: NoteLink) => void;
	/** The trail. */
	children: ReactNode;
}) {
	const design = useHeadingDesign();
	const note = subject?.kind === "Note" ? subject.note : null;
	const ported = usePortedReading(note);
	const portedFollow = usePortedFollow(note?.word ?? "", onFollow);
	return (
		<SheetChrome
			ruled={false}
			maxWidth={
				width ??
				(subject
					? sheetColumn(subject, true, ported !== null).title
					: "")
			}
			back={back}
			clear={clear}
			linksDrag={design.linksDrag}
		>
			{!titled || !subject ? (
				children
			) : ported ? (
				<PortedTitle
					note={ported}
					presentation="Sheet"
					follow={portedFollow}
				/>
			) : (
				<SheetTitle subject={subject} />
			)}
		</SheetChrome>
	);
}
