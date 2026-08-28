import {
	ExternalLinkIcon,
	GripHorizontalIcon,
	Volume2Icon,
} from "lucide-react";
import {
	type CSSProperties,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useState,
} from "react";
import { createPortal } from "react-dom";

import "./notes-study-playground.css";

type DragEdge = "top" | "bottom";
type VariantId = "midnight" | "catalog" | "field";

type NoteVariant = {
	readonly id: VariantId;
	readonly title: string;
	readonly description: string;
};

type CardDrag = {
	readonly edge: DragEdge;
	readonly pointerId: number;
	readonly x: number;
	readonly y: number;
};

const VARIANTS: readonly NoteVariant[] = [
	{
		id: "midnight",
		title: "Midnight index",
		description:
			"A low-light memory surface led by the definition and one vivid source line.",
	},
	{
		id: "catalog",
		title: "Catalog leaf",
		description:
			"An archival reference system that compresses the reading into a scan-ready index card.",
	},
	{
		id: "field",
		title: "Field folio",
		description:
			"A working note that gives the learner’s own association the most valuable space.",
	},
] as const;

export function NotesStudyPlayground() {
	return (
		<div className="notes-study">
			<div className="notes-study__variants">
				{VARIANTS.map((variant) => (
					<NotePrototype key={variant.id} variant={variant} />
				))}
			</div>
		</div>
	);
}

function NotePrototype({ variant }: { readonly variant: NoteVariant }) {
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
			className={`notes-prototype notes-prototype--${variant.id}`}
			aria-labelledby={`${variant.id}-prototype-title`}
		>
			<header className="notes-prototype__header">
				<div>
					<span className="notes-prototype__kind">
						Sheet / {variant.id}
					</span>
					<div>
						<h3 id={`${variant.id}-prototype-title`}>
							{variant.title}
						</h3>
						<p>{variant.description}</p>
					</div>
				</div>
				<p className="notes-prototype__instruction">
					<GripHorizontalIcon aria-hidden="true" />
					Pull from either edge to lift a card
				</p>
			</header>

			<div
				className="notes-prototype__stage"
				data-dragging={drag ? "true" : undefined}
			>
				<div
					className="notes-prototype__sheet"
					data-note-sheet={variant.id}
				>
					<SheetDragSurface
						edge="top"
						onPointerDown={beginDrag}
						onPointerMove={moveDrag}
						onPointerEnd={finishDrag}
					/>
					<div className="lexical-note">
						<NoteArticle variantId={variant.id} />
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
							data-card-preview={variant.id}
							data-drag-edge={drag.edge}
							style={dragStyle}
						>
							<NoteCard variantId={variant.id} />
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
}: {
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
}) {
	return (
		<button
			type="button"
			className="notes-prototype__sheet-handle"
			data-sheet-drag-edge={edge}
			aria-label={`Lift Sheet as Card from ${edge} edge`}
			onPointerDown={(event) => onPointerDown(event, edge)}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerEnd}
			onPointerCancel={onPointerEnd}
			onLostPointerCapture={onPointerEnd}
		>
			<GripHorizontalIcon aria-hidden="true" />
			<span>{edge === "top" ? "Lift card" : "Pull card"}</span>
		</button>
	);
}

function NoteCard({ variantId }: { readonly variantId: VariantId }) {
	if (variantId === "catalog") return <CatalogCard />;
	if (variantId === "field") return <FieldCard />;
	return <MidnightCard />;
}

function MidnightCard() {
	return (
		<article className="note-card note-card--midnight">
			<header className="note-card__word-row">
				<div>
					<p>German · noun · feminine</p>
					<h4>die Dämmerung</h4>
				</div>
				<button
					type="button"
					tabIndex={-1}
					aria-label="Play pronunciation"
				>
					<Volume2Icon aria-hidden="true" />
				</button>
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

function CatalogCard() {
	return (
		<article className="note-card note-card--catalog">
			<div className="catalog-card__rail" aria-hidden="true">
				DE · N · 041
			</div>
			<header>
				<span>noun / feminine</span>
				<h4>Dämmerung</h4>
				<p>twilight; dusk</p>
			</header>
			<dl>
				<div>
					<dt>Plural</dt>
					<dd>Dämmerungen</dd>
				</div>
				<div>
					<dt>Built from</dt>
					<dd>dämmern + -ung</dd>
				</div>
			</dl>
			<blockquote>noch vor der Dämmerung auf den Rückweg</blockquote>
			<footer>
				<span>TAGESZEIT</span>
				<span>ABLEITUNG</span>
			</footer>
		</article>
	);
}

function FieldCard() {
	return (
		<article className="note-card note-card--field">
			<header>
				<span className="field-card__initial">D</span>
				<div>
					<p>field note · German</p>
					<h4>die Dämmerung</h4>
				</div>
				<span className="field-card__translation">twilight</span>
			</header>
			<section>
				<p>Your note</p>
				<strong>
					“The blue hour on the walk home—light is leaving, but it
					isn’t dark yet.”
				</strong>
			</section>
			<blockquote>
				Wir machten uns noch vor der Dämmerung auf den Rückweg.
			</blockquote>
			<footer>Abendlicht · Zwielicht · Sonnenuntergang</footer>
		</article>
	);
}

function NoteArticle({ variantId }: { readonly variantId: VariantId }) {
	const noteId = `${variantId}-note`;

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
							<LinkedWord nounGender="feminine">
								Dämmerungen
							</LinkedWord>
						</span>
					</h4>
					<button
						type="button"
						className="lexical-note__sound"
						aria-label="Play pronunciation"
					>
						<Volume2Icon aria-hidden="true" />
					</button>
				</div>
				<div className="lexical-note__meta">
					<span>/ˈdɛmərʊŋ/</span>
					<span>N · f</span>
					<button
						type="button"
						aria-label="Open this note in a new sheet"
					>
						<ExternalLinkIcon aria-hidden="true" />
					</button>
				</div>
			</header>

			<div className="lexical-note__layout">
				<section
					className="note-section note-section--contexts"
					aria-labelledby={`${noteId}-contexts`}
				>
					<SectionLabel id={`${noteId}-contexts`}>
						In context
					</SectionLabel>
					<div className="source-contexts">
						<blockquote>
							Die{" "}
							<LinkedWord nounGender="feminine">
								Dämmerung
							</LinkedWord>{" "}
							legte sich langsam über den See, und am
							gegenüberliegenden Ufer gingen die ersten Lichter
							an.
						</blockquote>
						<blockquote>
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
					aria-labelledby={`${noteId}-writing`}
				>
					<SectionLabel id={`${noteId}-writing`}>
						Your note
					</SectionLabel>
					<label
						className="note-writing"
						htmlFor={`${noteId}-textarea`}
					>
						<span className="sr-only">
							Write a personal note about Dämmerung
						</span>
						<textarea
							id={`${noteId}-textarea`}
							placeholder="Write a phrase, memory, or distinction…"
						/>
					</label>
				</section>

				<section
					className="note-section note-section--relations"
					aria-labelledby={`${noteId}-relations`}
				>
					<SectionLabel id={`${noteId}-relations`}>
						Relations
					</SectionLabel>
					<ul className="relation-list">
						<li>
							<RelationMark>=</RelationMark>
							<span>
								<LinkedWord nounGender="neuter">
									Zwielicht
								</LinkedWord>
								,{" "}
								<LinkedWord nounGender="feminine">
									Abenddämmerung
								</LinkedWord>
							</span>
						</li>
						<li>
							<RelationMark>≈</RelationMark>
							<span>
								<LinkedWord nounGender="neuter">
									Abendlicht
								</LinkedWord>
								,{" "}
								<LinkedWord nounGender="masculine">
									Sonnenuntergang
								</LinkedWord>
							</span>
						</li>
						<li>
							<RelationMark>≠</RelationMark>
							<span>
								<LinkedWord nounGender="feminine">
									Dunkelheit
								</LinkedWord>
								,{" "}
								<LinkedWord nounGender="neuter">
									Tageslicht
								</LinkedWord>
							</span>
						</li>
					</ul>
				</section>

				<section
					className="note-section note-section--word-building"
					aria-labelledby={`${noteId}-building`}
				>
					<SectionLabel id={`${noteId}-building`}>
						Word building
					</SectionLabel>
					<p className="word-seam">
						<LinkedWord>Dämmer</LinkedWord>
						<b aria-hidden="true">|</b>
						<LinkedWord>ung</LinkedWord>
					</p>
					<p>
						<LinkedWord>dämmern</LinkedWord>{" "}
						<span aria-hidden="true">+</span>{" "}
						<LinkedWord>-ung</LinkedWord>
					</p>
				</section>

				<section
					className="note-section note-section--translation"
					aria-labelledby={`${noteId}-translation`}
				>
					<SectionLabel id={`${noteId}-translation`}>
						English
					</SectionLabel>
					<p>twilight; dusk</p>
				</section>

				<section
					className="note-section note-section--forms"
					aria-labelledby={`${noteId}-forms`}
				>
					<SectionLabel id={`${noteId}-forms`}>Forms</SectionLabel>
					<dl>
						<div>
							<dt>N</dt>
							<dd>
								die{" "}
								<LinkedWord nounGender="feminine">
									Dämmerung
								</LinkedWord>
								, die{" "}
								<LinkedWord nounGender="feminine">
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
								<LinkedWord nounGender="feminine">
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
								<LinkedWord nounGender="feminine">
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
								<LinkedWord nounGender="feminine">
									Dämmerungen
								</LinkedWord>
							</dd>
						</div>
					</dl>
				</section>
			</div>

			<footer className="lexical-note__footer">
				<span>#Tageszeit</span>
				<span>#Ableitung</span>
				<span>#Abstraktum</span>
			</footer>
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
			{children}
		</h5>
	);
}

function LinkedWord({
	children,
	nounGender,
}: {
	readonly children: string;
	readonly nounGender?: "feminine" | "neuter" | "masculine";
}) {
	return (
		<button
			type="button"
			className="linked-word"
			data-noun-gender={nounGender}
			aria-label={
				nounGender ? `${children}, ${nounGender} noun` : undefined
			}
		>
			{children}
		</button>
	);
}

function RelationMark({ children }: { readonly children: ReactNode }) {
	return (
		<span className="relation-mark" aria-hidden="true">
			{children}
		</span>
	);
}
