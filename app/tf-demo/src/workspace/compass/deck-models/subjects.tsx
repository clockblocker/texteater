import { CARD_WIDTH_REM } from "compass";
import { sheetColumn } from "@/workspace/compass/layout";
import type { SubjectRenderer, SubjectView } from "@/workspace/compass/subject";
import { BodyBlock, ContextsBlock, LinksBlock, TextBlock } from "./blocks";
import { cleanWord, type DummyNote, deckFor, type NoteLink } from "./dummy";
import {
	type Subject,
	subjectGloss,
	subjectLabel,
	subjectOfLink,
} from "./model";
import {
	PortedBlocks,
	PortedTitle,
	usePortedFollow,
	usePortedReading,
} from "./real-note";

/**
 * How the playground's dummy Subjects render in the Compass: a Text's
 * Blocks are its Sentences; a Note's are its Source Contexts, lines and
 * Links, or, for a ported Note, the real Notes renderers'.
 */

/** A Text reads at prose width. */
const TEXT_COLUMN_REM = 40;
/** A ported Note lays out on the Notes page's column, `--container-note`. */
const PORTED_COLUMN_REM = 50;

export function playgroundRenderer({
	showReader,
}: {
	/** A Text Ground with the reader hidden: the workbench's quiet scenes. */
	showReader: boolean;
}): SubjectRenderer<Subject> {
	const columnRem = (subject: Subject) =>
		subject.kind === "Text"
			? TEXT_COLUMN_REM
			: subject.note.fixture
				? PORTED_COLUMN_REM
				: CARD_WIDTH_REM;
	return {
		label: subjectLabel,
		columnRem,
		render: (subject, view, part) =>
			part === "heading" ? (
				subject.kind === "Note" && subject.note.fixture ? (
					<PortedHeading note={subject.note} view={view} />
				) : (
					<DummyHeading subject={subject} view={view} />
				)
			) : subject.kind === "Note" && subject.note.fixture ? (
				<PortedBody note={subject.note} view={view} />
			) : (
				<DummyBody
					subject={subject}
					view={view}
					columnRem={columnRem(subject)}
					showReader={showReader}
				/>
			),
	};
}

/** What a dummy Block's Segment and Link callbacks do in this Sheet. */
function segmentsOf(view: SubjectView<Subject>) {
	return {
		onSegment: (word: string, element: HTMLElement) =>
			view.deal(
				cleanWord(word),
				deckFor(word).map((note) => ({
					subject: { kind: "Note", note } as const,
				})),
				element,
			),
		onSegmentDown: view.liftOnDrag,
		onFollow: (link: NoteLink) => view.follow(subjectOfLink(link)),
	};
}

function DummyHeading({
	subject,
	view,
}: {
	subject: Subject;
	view: SubjectView<Subject>;
}) {
	const gloss = subjectGloss(subject);
	const title =
		subject.kind === "Text" ? subject.text.title : subject.note.tail.form;
	if (view.form === "card")
		return (
			<>
				<h2 className="min-w-0 flex-1 truncate font-serif text-[1rem] font-normal leading-tight text-ink">
					{title}
				</h2>
				{gloss ? (
					<span className="shrink-0 pb-[0.15rem] text-[0.72rem] text-ink-muted">
						{gloss}
					</span>
				) : null}
			</>
		);
	/* a Sheet's title: the form, then what kind of Note it is */
	return (
		<div className="flex min-w-0 items-baseline gap-3">
			<h2 className="min-w-0 truncate font-serif text-[1rem] font-normal leading-[1.4] text-ink">
				{title}
			</h2>
			{subject.kind === "Note" ? (
				<span className="shrink-0 font-mono text-[0.62rem] tracking-[0.08em] text-ink-muted uppercase">
					{subject.note.kind}
					{gloss ? (
						<span className="ms-2 normal-case tracking-normal">
							{gloss}
						</span>
					) : null}
				</span>
			) : null}
		</div>
	);
}

function DummyBody({
	subject,
	view,
	columnRem,
	showReader,
}: {
	subject: Subject;
	view: SubjectView<Subject>;
	columnRem: number;
	showReader: boolean;
}) {
	const sheet = view.form === "sheet";
	const below = view.place === "below" && !sheet;
	const { body, gutterRem } = sheetColumn(columnRem, sheet);
	const segments = segmentsOf(view);
	return (
		<div
			className={`mx-auto flex w-full flex-col gap-3 ${below ? "pt-3" : sheet ? "pt-4 pb-4" : "pb-4"}`}
			style={{
				maxWidth: body,
				paddingInline: `${gutterRem.toString()}rem`,
			}}
		>
			{subject.kind === "Text" ? (
				<TextBlock
					text={subject.text}
					focus={subject.focus}
					form={view.form}
					shown={showReader}
					litWord={view.lit}
					onSegment={segments.onSegment}
					onSegmentDown={segments.onSegmentDown}
				/>
			) : (
				<>
					<ContextsBlock
						note={subject.note}
						form={view.form}
						litWord={view.lit}
						onSegment={segments.onSegment}
						onSegmentDown={segments.onSegmentDown}
					/>
					<BodyBlock note={subject.note} />
					<LinksBlock
						note={subject.note}
						form={view.form}
						onFollow={segments.onFollow}
						onSegmentDown={segments.onSegmentDown}
					/>
				</>
			)}
		</div>
	);
}

/** A ported Note's real Heading; the dummy one while the fake db loads. */
function PortedHeading({
	note,
	view,
}: {
	note: DummyNote;
	view: SubjectView<Subject>;
}) {
	const ported = usePortedReading(note);
	const follow = usePortedFollow(note.word, segmentsOf(view).onFollow);
	if (!ported)
		return <DummyHeading subject={{ kind: "Note", note }} view={view} />;
	return (
		<div className="min-w-0 flex-1">
			<PortedTitle
				note={ported}
				presentation={view.form === "card" ? "Card" : "Sheet"}
				follow={follow}
			/>
		</div>
	);
}

/**
 * A ported Note's Blocks but its Heading, as the Notes page renders them.
 * A Card's links are inert until it is a Sheet (#485). A Sheet's Heading
 * is its title, so the first Block keeps only the air it keeps under one.
 */
function PortedBody({
	note,
	view,
}: {
	note: DummyNote;
	view: SubjectView<Subject>;
}) {
	const ported = usePortedReading(note);
	const follow = usePortedFollow(note.word, segmentsOf(view).onFollow);
	const sheet = view.form === "sheet";
	if (!ported) return null;
	return (
		<div
			inert={!sheet}
			className={sheet ? "[&_[data-note-presentation]>article]:pt-0" : ""}
		>
			<PortedBlocks
				note={ported}
				presentation={sheet ? "Sheet" : "Card"}
				follow={follow}
			/>
		</div>
	);
}
