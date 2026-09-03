import type { SemanticRelation } from "dumrel";
import { ArrowUpRightIcon } from "lucide-react";
import {
	type CSSProperties,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { playgroundExperimentHref } from "@/playground/playground-route";
import { NOTE_STUDY_FIXTURES } from "./fixtures";
import type {
	NoteStudyFixture,
	NoteStudyLine,
	NoteStudyToken,
	NoteStudyTone,
} from "./note-study-fixture";
import "./notes-study-playground.css";

type DragEdge = "top" | "bottom";

type CardDrag = {
	readonly edge: DragEdge;
	readonly pointerId: number;
	readonly x: number;
	readonly y: number;
	readonly overCardLayer: boolean;
};

type SheetAffordanceProps = {
	readonly edge: DragEdge;
	readonly onPointerDown: (
		event: ReactPointerEvent<HTMLButtonElement>,
		edge: DragEdge,
	) => void;
	readonly onPointerMove: (
		event: ReactPointerEvent<HTMLButtonElement>,
	) => void;
	readonly onPointerEnd: (
		event: ReactPointerEvent<HTMLButtonElement>,
		placeCard: boolean,
	) => void;
};

const FAMILY_ORDER = ["Lexeme", "Phraseme", "Morpheme"] as const;

function fitNoteEditorToContent(editor: HTMLTextAreaElement | null) {
	if (!editor) return;
	editor.style.height = "0";
	editor.style.height = `${editor.scrollHeight}px`;
}

export function NotesStudyPlayground({
	detailId,
}: {
	readonly detailId?: string;
}) {
	if (!detailId) return <NotesStudyIndex />;

	const fixture = NOTE_STUDY_FIXTURES.find(({ slug }) => slug === detailId);
	return fixture ? (
		<div className="notes-study">
			<div className="notes-study__variants">
				<NotePrototype fixture={fixture} />
			</div>
		</div>
	) : (
		<MissingNote detailId={detailId} />
	);
}

function NotesStudyIndex() {
	return (
		<div className="notes-study notes-study--index">
			<header className="notes-study-index__hero">
				<div>
					<p className="notes-study-index__eyebrow">
						German Unit Readings
					</p>
					<h2>Every note has a shelf.</h2>
				</div>
				<p>
					Thirty-two deterministic Reading notes cover the German
					Family/Kind routes under study. Open one to inspect the same
					Sheet-to-Card transformation used by Dämmerung.
				</p>
			</header>

			<nav
				className="notes-study-index__shelves"
				aria-label="German notes"
			>
				{FAMILY_ORDER.map((family) => {
					const fixtures = NOTE_STUDY_FIXTURES.filter(
						(fixture) => fixture.family === family,
					);
					return (
						<section
							className="note-shelf"
							key={family}
							aria-labelledby={`note-shelf-${family}`}
						>
							<header>
								<h3
									className="note-shelf__title"
									id={`note-shelf-${family}`}
								>
									{family}
								</h3>
								<span className="note-shelf__count">
									{String(fixtures.length).padStart(2, "0")}
								</span>
							</header>
							<ol>
								{fixtures.map((fixture) => (
									<li key={fixture.slug}>
										<a
											href={playgroundExperimentHref(
												"notes-study",
												fixture.slug,
											)}
										>
											<span className="note-shelf__kind">
												{fixture.kind}
											</span>
											<span className="note-shelf__reading">
												<i aria-hidden="true">
													{fixture.emoji}
												</i>
												<strong>
													{fixture.titleText}
												</strong>
												<small>
													{fixture.definition}
												</small>
											</span>
											<ArrowUpRightIcon aria-hidden="true" />
										</a>
									</li>
								))}
							</ol>
						</section>
					);
				})}
			</nav>
		</div>
	);
}

function MissingNote({ detailId }: { readonly detailId: string }) {
	return (
		<div className="notes-study notes-study--missing">
			<p className="notes-study-index__eyebrow">Unknown Reading note</p>
			<h2>No note is filed as “{detailId}”.</h2>
			<a href={playgroundExperimentHref("notes-study")}>
				Open the note list
			</a>
		</div>
	);
}

function NotePrototype({ fixture }: { readonly fixture: NoteStudyFixture }) {
	const [drag, setDrag] = useState<CardDrag | null>(null);
	const [cardPlaced, setCardPlaced] = useState(false);
	const cardLayerRef = useRef<HTMLElement>(null);

	function isOverCardLayer(x: number, y: number) {
		const bounds = cardLayerRef.current?.getBoundingClientRect();
		return Boolean(
			bounds &&
				x >= bounds.left &&
				x <= bounds.right &&
				y >= bounds.top &&
				y <= bounds.bottom,
		);
	}

	function beginDrag(
		event: ReactPointerEvent<HTMLButtonElement>,
		edge: DragEdge,
	) {
		event.preventDefault();
		event.currentTarget.setPointerCapture(event.pointerId);
		setDrag({
			edge,
			pointerId: event.pointerId,
			x: event.clientX,
			y: event.clientY,
			overCardLayer: false,
		});
	}

	function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
		setDrag((current) =>
			current?.pointerId === event.pointerId
				? {
						...current,
						x: event.clientX,
						y: event.clientY,
						overCardLayer: isOverCardLayer(
							event.clientX,
							event.clientY,
						),
					}
				: current,
		);
	}

	function finishDrag(
		event: ReactPointerEvent<HTMLButtonElement>,
		placeCard: boolean,
	) {
		if (drag?.pointerId !== event.pointerId) return;
		if (placeCard && isOverCardLayer(event.clientX, event.clientY)) {
			setCardPlaced(true);
		}
		setDrag(null);
	}

	const dragStyle = drag
		? ({
				"--drag-x": `${drag.x}px`,
				"--drag-y": `${drag.y}px`,
			} as CSSProperties)
		: undefined;
	const noteId = `midnight-${fixture.slug}`;

	return (
		<section
			className="notes-prototype notes-prototype--midnight"
			aria-labelledby="midnight-prototype-title"
			data-note-fixture={fixture.slug}
		>
			<header className="notes-prototype__header">
				<div>
					<span className="notes-prototype__kind">
						{fixture.family} / {fixture.kind}
					</span>
					<div>
						<h3 id="midnight-prototype-title">Midnight index</h3>
						<p>{fixture.summary}</p>
					</div>
				</div>
				<p className="notes-prototype__instruction">
					Drag a Sheet edge to lift its Card
				</p>
			</header>

			<div
				className="notes-prototype__stage"
				data-dragging={drag ? "true" : undefined}
			>
				<div
					className="notes-prototype__sheet"
					data-note-sheet="midnight"
				>
					<SheetDragSurface
						edge="top"
						onPointerDown={beginDrag}
						onPointerMove={moveDrag}
						onPointerEnd={finishDrag}
					/>
					<div className="lexical-note">
						<NoteArticle fixture={fixture} noteId={noteId} />
					</div>
					<SheetDragSurface
						edge="bottom"
						onPointerDown={beginDrag}
						onPointerMove={moveDrag}
						onPointerEnd={finishDrag}
					/>
				</div>
				<aside
					ref={cardLayerRef}
					className="notes-prototype__card-layer"
					data-card-layer-surface="midnight"
					data-drag-over={drag?.overCardLayer ? "true" : undefined}
					data-occupied={cardPlaced ? "true" : undefined}
					aria-label="Card Layer"
				>
					<header className="card-layer__header">
						<span>Card Layer</span>
						<span aria-live="polite">
							{cardPlaced ? "Card retained" : "Drop Card here"}
						</span>
					</header>
					<div className="card-layer__surface">
						{cardPlaced ? (
							<div
								className="card-layer__placed-card note-card-view"
								data-placed-card="midnight"
							>
								<FixtureCard
									fixture={fixture}
									noteId={`${noteId}-card`}
								/>
							</div>
						) : (
							<div
								className="card-layer__empty"
								aria-hidden="true"
							>
								<i />
								<span>Drop Card</span>
							</div>
						)}
					</div>
				</aside>
			</div>

			{drag
				? createPortal(
						<div
							aria-hidden="true"
							className="notes-prototype__card-drag-layer"
							data-card-preview="midnight"
							data-drag-edge={drag.edge}
							inert
							style={dragStyle}
						>
							<div className="note-card-view">
								<FixtureCard
									fixture={fixture}
									noteId={`${noteId}-preview`}
								/>
							</div>
						</div>,
						document.body,
					)
				: null}
		</section>
	);
}

function SheetDragSurface({
	edge,
	onPointerDown,
	onPointerMove,
	onPointerEnd,
}: SheetAffordanceProps) {
	return (
		<button
			type="button"
			className="notes-prototype__sheet-handle sheet-edge-lift"
			data-sheet-drag-edge={edge}
			aria-label={`Lift Sheet as Card from ${edge} edge`}
			onLostPointerCapture={(event) => onPointerEnd(event, false)}
			onPointerCancel={(event) => onPointerEnd(event, false)}
			onPointerDown={(event) => onPointerDown(event, edge)}
			onPointerMove={onPointerMove}
			onPointerUp={(event) => onPointerEnd(event, true)}
		>
			<span className="sheet-edge-lift__rule" aria-hidden="true">
				<i />
			</span>
		</button>
	);
}

function FixtureCard({
	fixture,
	noteId,
}: {
	readonly fixture: NoteStudyFixture;
	readonly noteId: string;
}) {
	return (
		<>
			<span
				aria-hidden="true"
				className="note-card-view__drag-surface"
				data-card-drag-surface="top"
			/>
			<div className="lexical-note">
				<NoteArticle
					fixture={fixture}
					noteId={noteId}
					showSectionTitles={false}
				/>
			</div>
			<span
				aria-hidden="true"
				className="note-card-view__drag-surface"
				data-card-drag-surface="bottom"
			/>
		</>
	);
}

function NoteArticle({
	fixture,
	noteId,
	showSectionTitles = true,
}: {
	readonly fixture: NoteStudyFixture;
	readonly noteId: string;
	readonly showSectionTitles?: boolean;
}) {
	return (
		<article
			className="lexical-note__article"
			aria-labelledby={`${noteId}-title`}
		>
			<header className="lexical-note__title-row">
				<div className="lexical-note__lemma">
					<span className="lexical-note__emoji" aria-hidden="true">
						{fixture.emoji}
					</span>
					<h4 id={`${noteId}-title`}>
						<RichLine line={fixture.title} />
					</h4>
				</div>
				{fixture.ipa ? (
					fixture.pronunciationHref ? (
						<a
							className="lexical-note__ipa"
							href={fixture.pronunciationHref}
							target="_blank"
							rel="noreferrer"
						>
							{fixture.ipa}
						</a>
					) : (
						<span className="lexical-note__ipa">{fixture.ipa}</span>
					)
				) : null}
			</header>

			<div className="lexical-note__layout">
				<NoteSection
					className="note-section--contexts"
					label="Im Kontext"
					noteId={noteId}
					showTitle={showSectionTitles}
				>
					<div className="source-contexts">
						{fixture.contexts.map((context, index) => (
							<blockquote
								key={`${fixture.slug}-context-${index}`}
							>
								<ContextBar tone={fixture.contextTone} />
								<RichLine line={context} />
							</blockquote>
						))}
					</div>
				</NoteSection>

				<section
					className="note-section note-section--writing"
					aria-label="Deine Notiz"
				>
					<label
						className="note-writing"
						htmlFor={`${noteId}-textarea`}
					>
						<span className="sr-only">
							Write a personal note about {fixture.titleText}
						</span>
						<textarea
							id={`${noteId}-textarea`}
							placeholder="..."
							ref={fitNoteEditorToContent}
							onInput={(event) =>
								fitNoteEditorToContent(event.currentTarget)
							}
						/>
					</label>
				</section>

				{fixture.relations ? (
					<NoteSection
						className="note-section--relations"
						label="Beziehungen"
						noteId={noteId}
						showTitle={showSectionTitles}
					>
						<dl className="relation-list">
							{fixture.relations.map((relation) => (
								<RelationRow
									key={relation.relation}
									{...relation}
								>
									<RichLine line={relation.content} />
								</RelationRow>
							))}
						</dl>
					</NoteSection>
				) : null}

				{fixture.formation ? (
					<NoteSection
						className="note-section--word-building"
						label="Wortbildung"
						noteId={noteId}
						showTitle={showSectionTitles}
					>
						{fixture.formation.map((line, index) => (
							<p
								className={
									index === 0 ? "word-seam" : undefined
								}
								key={`${fixture.slug}-formation-${index}`}
							>
								<RichLine line={line} />
							</p>
						))}
					</NoteSection>
				) : null}

				{fixture.structure ? (
					<NoteSection
						className="note-section--word-building"
						label="Struktur"
						noteId={noteId}
						showTitle={showSectionTitles}
					>
						{fixture.structure.map((line, index) => (
							<p key={`${fixture.slug}-structure-${index}`}>
								<RichLine line={line} />
							</p>
						))}
					</NoteSection>
				) : null}

				<NoteSection
					className="note-section--translation"
					label="Übersetzung"
					noteId={noteId}
					showTitle={showSectionTitles}
				>
					<p>
						{fixture.translations.map((translation, index) => (
							<span key={`${fixture.slug}-translation-${index}`}>
								{index > 0 ? <br /> : null}
								{translation}
							</span>
						))}
					</p>
				</NoteSection>

				{fixture.translatedExplanations ? (
					<NoteSection
						className="note-section--translation note-section--translated-explanation"
						label="Sinngemäß"
						noteId={noteId}
						showTitle={showSectionTitles}
					>
						<p>
							{fixture.translatedExplanations.map(
								(explanation, index) => (
									<span
										key={`${fixture.slug}-translated-explanation-${index}`}
									>
										{index > 0 ? <br /> : null}
										{explanation}
									</span>
								),
							)}
						</p>
					</NoteSection>
				) : null}

				<footer className="lexical-note__footer">
					{fixture.tags.map((tag) => (
						<span {...toneDataAttributes(tag.tone)} key={tag.text}>
							{tag.text}
						</span>
					))}
				</footer>
			</div>

			{fixture.forms || fixture.formTable ? (
				<NoteSection
					className="note-section--forms"
					label="Formen"
					noteId={noteId}
					showTitle={showSectionTitles}
				>
					{fixture.formTable ? (
						<div className="form-table-scroll">
							<table className="form-table">
								<thead>
									<tr>
										<th
											className="form-table__corner"
											scope="col"
										>
											<span className="sr-only">
												{fixture.formTable.rowLabel}
											</span>
										</th>
										{fixture.formTable.columnLabels.map(
											(label) => (
												<th key={label} scope="col">
													{label}
												</th>
											),
										)}
									</tr>
								</thead>
								<tbody>
									{fixture.formTable.rows.map((row) => (
										<tr key={row.label}>
											<th scope="row">{row.label}</th>
											{row.cells.map((cell, index) => (
												<td
													key={`${fixture.slug}-${row.label}-${fixture.formTable?.columnLabels[index]}`}
												>
													<RichLine line={cell} />
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<dl>
							{fixture.forms?.map((form) => (
								<div key={form.label}>
									<dt>{form.label}</dt>
									<dd>
										<RichLine line={form.content} />
									</dd>
								</div>
							))}
						</dl>
					)}
				</NoteSection>
			) : null}
		</article>
	);
}

function NoteSection({
	children,
	className,
	label,
	noteId,
	showTitle,
}: {
	readonly children: ReactNode;
	readonly className: string;
	readonly label: string;
	readonly noteId: string;
	readonly showTitle: boolean;
}) {
	const id = `${noteId}-${label.toLocaleLowerCase("de").replace(/\s/g, "-")}`;
	return (
		<section
			className={`note-section ${className}`}
			aria-label={showTitle ? undefined : label}
			aria-labelledby={showTitle ? id : undefined}
		>
			{showTitle ? <SectionLabel id={id}>{label}</SectionLabel> : null}
			{children}
		</section>
	);
}

function ContextBar({ tone }: { readonly tone?: NoteStudyTone }) {
	return (
		<span
			aria-hidden="true"
			className="source-context__bar"
			{...toneDataAttributes(tone)}
		/>
	);
}

function RichLine({ line }: { readonly line: NoteStudyLine }) {
	return line.map((part, index) =>
		typeof part === "string" ? (
			part
		) : (
			<LinkedWord key={`${part.text}-${index}`} token={part} />
		),
	);
}

function SectionLabel({
	id,
	children,
}: {
	readonly id: string;
	readonly children: ReactNode;
}) {
	return (
		<h5 id={id} className="note-section__label">
			<span>{children}</span>
		</h5>
	);
}

function LinkedWord({ token }: { readonly token: NoteStudyToken }) {
	const description =
		token.description ??
		(token.tone === "shadow"
			? "Unit Shadow"
			: token.tone === "feminine"
				? "feminine noun"
				: token.tone === "masculine"
					? "masculine noun"
					: token.tone === "neuter"
						? "neuter noun"
						: token.tone === "plural"
							? "plural"
							: "Reading reference");
	const accessibleName = description.startsWith(`${token.text},`)
		? description
		: `${token.text}, ${description}`;
	return (
		<button
			type="button"
			className="linked-word"
			{...toneDataAttributes(token.tone)}
			aria-label={accessibleName}
		>
			{token.text}
		</button>
	);
}

function toneDataAttributes(tone?: NoteStudyTone) {
	return {
		"data-noun-gender":
			tone === "feminine" || tone === "masculine" || tone === "neuter"
				? tone
				: undefined,
		"data-number": tone === "plural" ? "plural" : undefined,
		"data-shadow-note": tone === "shadow" ? "" : undefined,
		"data-unit-reference": tone === "reference" ? "" : undefined,
	};
}

function RelationRow({
	children,
	label,
	mark,
	relation,
}: {
	readonly children: ReactNode;
	readonly label: string;
	readonly mark: string;
	readonly relation: SemanticRelation;
}) {
	return (
		<div data-relation={relation}>
			<dt>
				<Tooltip>
					<TooltipTrigger
						render={
							<span
								className="relation-mark"
								role="img"
								aria-label={label}
							/>
						}
					>
						{mark}
					</TooltipTrigger>
					<TooltipContent>
						<p>{label}</p>
					</TooltipContent>
				</Tooltip>
			</dt>
			<dd>{children}</dd>
		</div>
	);
}
