import type { DirectSemanticRelation } from "dumrel";
import {
	type CSSProperties,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useState,
} from "react";
import { createPortal } from "react-dom";

import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import "./notes-study-playground.css";

type DragEdge = "top" | "bottom";

type CardDrag = {
	readonly edge: DragEdge;
	readonly pointerId: number;
	readonly x: number;
	readonly y: number;
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
	) => void;
};

function fitNoteEditorToContent(editor: HTMLTextAreaElement | null) {
	if (!editor) return;
	editor.style.height = "0";
	editor.style.height = `${editor.scrollHeight}px`;
}

export function NotesStudyPlayground() {
	return (
		<div className="notes-study">
			<div className="notes-study__variants">
				<NotePrototype />
			</div>
		</div>
	);
}

function NotePrototype() {
	const [drag, setDrag] = useState<CardDrag | null>(null);

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
		});
	}

	function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
		setDrag((current) =>
			current?.pointerId === event.pointerId
				? { ...current, x: event.clientX, y: event.clientY }
				: current,
		);
	}

	function finishDrag(event: ReactPointerEvent<HTMLButtonElement>) {
		setDrag((current) =>
			current?.pointerId === event.pointerId ? null : current,
		);
	}

	const dragStyle = drag
		? ({
				"--drag-x": `${drag.x}px`,
				"--drag-y": `${drag.y}px`,
			} as CSSProperties)
		: undefined;

	return (
		<section
			className="notes-prototype notes-prototype--midnight"
			aria-labelledby="midnight-prototype-title"
		>
			<header className="notes-prototype__header">
				<div>
					<span className="notes-prototype__kind">
						Sheet / midnight
					</span>
					<div>
						<h3 id="midnight-prototype-title">Midnight index</h3>
						<p>
							A low-light memory surface led by the definition and
							one vivid source line.
						</p>
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
						<NoteArticle />
					</div>
					<SheetDragSurface
						edge="bottom"
						onPointerDown={beginDrag}
						onPointerMove={moveDrag}
						onPointerEnd={finishDrag}
					/>
				</div>
			</div>

			{drag
				? createPortal(
						<div
							aria-hidden="true"
							className="notes-prototype__card-drag-layer"
							data-card-preview="midnight"
							data-drag-edge={drag.edge}
							style={dragStyle}
						>
							<MidnightCard />
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
			onLostPointerCapture={onPointerEnd}
			onPointerCancel={onPointerEnd}
			onPointerDown={(event) => onPointerDown(event, edge)}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerEnd}
		>
			<span className="sheet-edge-lift__rule" aria-hidden="true">
				<i />
			</span>
		</button>
	);
}

function MidnightCard() {
	return (
		<article className="note-card note-card--midnight">
			<header className="note-card__word-row">
				<div>
					<p>Deutsch · Substantiv · feminin</p>
					<h4>die Dämmerung</h4>
				</div>
			</header>
			<div className="midnight-card__meaning">
				<span>twilight</span>
				<small>/ˈdɛmərʊŋ/</small>
			</div>
			<blockquote>
				Die <b>Dämmerung</b> legte sich langsam über den See, und am
				Ufer gingen die ersten Lichter an.
			</blockquote>
			<footer>
				<span>≈ Abendlicht</span>
				<span>≠ Tageslicht</span>
			</footer>
		</article>
	);
}

function NoteArticle() {
	const noteId = "midnight-note";

	return (
		<article
			className="lexical-note__article"
			aria-labelledby={`${noteId}-title`}
		>
			<header className="lexical-note__title-row">
				<div className="lexical-note__lemma">
					<span className="lexical-note__emoji" aria-hidden="true">
						🌒
					</span>
					<h4 id={`${noteId}-title`}>
						die{" "}
						<LinkedWord nounGender="feminine">Dämmerung</LinkedWord>
						<span>
							, die{" "}
							<LinkedWord nounGender="feminine" number="plural">
								Dämmerungen
							</LinkedWord>
						</span>
					</h4>
				</div>
				<a
					className="lexical-note__ipa"
					href="https://youglish.com/pronounce/D%C3%A4mmerung/german"
					target="_blank"
					rel="noreferrer"
				>
					/ˈdɛmərʊŋ/
				</a>
			</header>

			<div className="lexical-note__layout">
				<section
					className="note-section note-section--contexts"
					aria-labelledby={`${noteId}-contexts`}
				>
					<SectionLabel id={`${noteId}-contexts`}>
						Im Kontext
					</SectionLabel>
					<div className="source-contexts">
						<blockquote>
							<span
								aria-hidden="true"
								className="source-context__bar"
								data-noun-gender="feminine"
							/>
							Die{" "}
							<LinkedWord nounGender="feminine">
								Dämmerung
							</LinkedWord>{" "}
							legte sich langsam über den See, und am
							gegenüberliegenden Ufer gingen die ersten Lichter
							an.
						</blockquote>
						<blockquote>
							<span
								aria-hidden="true"
								className="source-context__bar"
								data-noun-gender="feminine"
							/>
							Wir machten uns noch vor der{" "}
							<LinkedWord nounGender="feminine">
								Dämmerung
							</LinkedWord>{" "}
							auf den Rückweg, damit wir den schmalen Pfad
							erkennen konnten.
						</blockquote>
					</div>
				</section>

				<section
					className="note-section note-section--writing"
					aria-label="Deine Notiz"
				>
					<label
						className="note-writing"
						htmlFor={`${noteId}-textarea`}
					>
						<span className="sr-only">
							Write a personal note about Dämmerung
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

				<section
					className="note-section note-section--relations"
					aria-labelledby={`${noteId}-relations`}
				>
					<SectionLabel id={`${noteId}-relations`}>
						Beziehungen
					</SectionLabel>
					<dl className="relation-list">
						<RelationRow
							relation="synonym"
							mark="="
							label="Synonym"
						>
							<span>
								<LinkedWord nounGender="neuter">
									Zwielicht
								</LinkedWord>
							</span>
						</RelationRow>
						<RelationRow
							relation="nearSynonym"
							mark="≈"
							label="Nahes Synonym"
						>
							<span>
								<LinkedWord nounGender="neuter">
									Abendlicht
								</LinkedWord>
								,{" "}
								<LinkedWord nounGender="masculine">
									Sonnenuntergang
								</LinkedWord>
							</span>
						</RelationRow>
						<RelationRow
							relation="nearAntonym"
							mark="≉"
							label="Nahes Antonym"
						>
							<span>
								<LinkedWord nounGender="neuter">
									Tageslicht
								</LinkedWord>
								,{" "}
								<LinkedWord nounGender="feminine">
									Dunkelheit
								</LinkedWord>
							</span>
						</RelationRow>
						<RelationRow
							relation="hypernym"
							mark="↑"
							label="Oberbegriff"
						>
							<LinkedWord nounGender="masculine">
								Lichtzustand
							</LinkedWord>
						</RelationRow>
						<RelationRow
							relation="holonym"
							mark="⊂"
							label="Teil von"
						>
							<LinkedWord nounGender="masculine">
								Tageslauf
							</LinkedWord>
						</RelationRow>
					</dl>
				</section>

				<section
					className="note-section note-section--word-building"
					aria-labelledby={`${noteId}-building`}
				>
					<SectionLabel id={`${noteId}-building`}>
						Wortbildung
					</SectionLabel>
					<p className="word-seam">
						<LinkedWord wordKind="verb-stem">Dämmer</LinkedWord>
						<b aria-hidden="true">|</b>
						<LinkedWord suffixGender="feminine">ung</LinkedWord>
					</p>
					<p>
						<LinkedWord wordKind="verb">dämmern</LinkedWord>{" "}
						<span aria-hidden="true">+</span>{" "}
						<LinkedWord suffixGender="feminine">-ung</LinkedWord>
					</p>
				</section>

				<section
					className="note-section note-section--translation"
					aria-labelledby={`${noteId}-translation`}
				>
					<SectionLabel id={`${noteId}-translation`}>
						Übersetzung
					</SectionLabel>
					<p>
						twilight; dusk
						<br />
						закат;
					</p>
				</section>

				<footer className="lexical-note__footer">
					<span>#Nomen</span>
					<span data-noun-gender="feminine">#Feminin</span>
				</footer>
			</div>

			<section
				className="note-section note-section--forms"
				aria-labelledby={`${noteId}-forms`}
			>
				<SectionLabel id={`${noteId}-forms`}>Formen</SectionLabel>
				<dl>
					<div>
						<dt>N</dt>
						<dd>
							die{" "}
							<LinkedWord nounGender="feminine">
								Dämmerung
							</LinkedWord>
							, die{" "}
							<LinkedWord nounGender="feminine" number="plural">
								Dämmerungen
							</LinkedWord>
						</dd>
					</div>
					<div>
						<dt>A</dt>
						<dd>
							die{" "}
							<LinkedWord nounGender="feminine">
								Dämmerung
							</LinkedWord>
							, die{" "}
							<LinkedWord nounGender="feminine" number="plural">
								Dämmerungen
							</LinkedWord>
						</dd>
					</div>
					<div>
						<dt>G</dt>
						<dd>
							der{" "}
							<LinkedWord nounGender="feminine">
								Dämmerung
							</LinkedWord>
							, der{" "}
							<LinkedWord nounGender="feminine" number="plural">
								Dämmerungen
							</LinkedWord>
						</dd>
					</div>
					<div>
						<dt>D</dt>
						<dd>
							der{" "}
							<LinkedWord nounGender="feminine">
								Dämmerung
							</LinkedWord>
							, den{" "}
							<LinkedWord nounGender="feminine" number="plural">
								Dämmerungen
							</LinkedWord>
						</dd>
					</div>
				</dl>
			</section>
		</article>
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

function LinkedWord({
	children,
	nounGender,
	number,
	suffixGender,
	wordKind,
}: {
	readonly children: string;
	readonly nounGender?: "feminine" | "neuter" | "masculine";
	readonly number?: "plural";
	readonly suffixGender?: "feminine";
	readonly wordKind?: "verb" | "verb-stem";
}) {
	const description = [
		wordKind === "verb-stem" ? "verb stem" : wordKind,
		suffixGender ? `${suffixGender} noun-forming suffix` : undefined,
		nounGender ? `${nounGender} noun` : undefined,
		number,
	]
		.filter(Boolean)
		.join(", ");

	return (
		<button
			type="button"
			className="linked-word"
			data-noun-gender={nounGender}
			data-number={number}
			data-suffix-gender={suffixGender}
			data-word-kind={wordKind}
			aria-label={description ? `${children}, ${description}` : undefined}
		>
			{children}
		</button>
	);
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
	readonly relation: DirectSemanticRelation;
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
