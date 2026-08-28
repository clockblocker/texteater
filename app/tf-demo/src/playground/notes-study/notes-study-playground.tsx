import {
	ExternalLinkIcon,
	PanelTopIcon,
	SquareIcon,
	Volume2Icon,
} from "lucide-react";
import { type ReactNode, useState } from "react";

import "./notes-study-playground.css";

type NoteView = "pane" | "card";
type VariantId = "midnight" | "catalog" | "field";

type NoteVariant = {
	readonly id: VariantId;
	readonly title: string;
	readonly description: string;
	readonly initialView: NoteView;
};

const VARIANTS: readonly NoteVariant[] = [
	{
		id: "midnight",
		title: "Midnight index",
		description:
			"A low-light reading surface where memory-blue links and long source lines do most of the work.",
		initialView: "pane",
	},
	{
		id: "catalog",
		title: "Catalog leaf",
		description:
			"An archival, scan-friendly arrangement with a persistent label column and compact evidence rows.",
		initialView: "card",
	},
	{
		id: "field",
		title: "Field folio",
		description:
			"A softer working note that gives personal annotation equal footing with dictionary knowledge.",
		initialView: "pane",
	},
] as const;

const INITIAL_VIEWS = Object.fromEntries(
	VARIANTS.map(({ id, initialView }) => [id, initialView]),
) as Record<VariantId, NoteView>;

export function NotesStudyPlayground() {
	const [views, setViews] = useState(INITIAL_VIEWS);

	return (
		<div className="notes-study">
			<header className="notes-study__intro">
				<div>
					<span className="notes-study__kicker">
						Reading note / 03 studies
					</span>
					<h2>One word, three reading rooms.</h2>
				</div>
				<p>
					Each direction carries the same knowledge. Switch its
					container to judge how the note behaves as a workspace pane
					or as a portable card.
				</p>
			</header>

			<div className="notes-study__variants">
				{VARIANTS.map((variant) => (
					<NotePrototype
						key={variant.id}
						variant={variant}
						view={views[variant.id]}
						onViewChange={(view) =>
							setViews((current) => ({
								...current,
								[variant.id]: view,
							}))
						}
					/>
				))}
			</div>
		</div>
	);
}

function NotePrototype({
	variant,
	view,
	onViewChange,
}: {
	readonly variant: NoteVariant;
	readonly view: NoteView;
	readonly onViewChange: (view: NoteView) => void;
}) {
	return (
		<section
			className={`notes-prototype notes-prototype--${variant.id}`}
			aria-labelledby={`${variant.id}-prototype-title`}
		>
			<header className="notes-prototype__header">
				<div>
					<span className="notes-prototype__number">
						{String(VARIANTS.indexOf(variant) + 1).padStart(2, "0")}
					</span>
					<div>
						<h3 id={`${variant.id}-prototype-title`}>
							{variant.title}
						</h3>
						<p>{variant.description}</p>
					</div>
				</div>
				<ViewToggle
					label={`${variant.title} view`}
					value={view}
					onChange={onViewChange}
				/>
			</header>

			<div className="notes-prototype__stage" data-view={view}>
				<div className="lexical-note" data-note-view={view}>
					<NoteArticle variantId={variant.id} />
				</div>
			</div>
		</section>
	);
}

function ViewToggle({
	label,
	value,
	onChange,
}: {
	readonly label: string;
	readonly value: NoteView;
	readonly onChange: (view: NoteView) => void;
}) {
	return (
		<fieldset className="note-view-toggle" aria-label={label}>
			<legend className="sr-only">{label}</legend>
			<button
				type="button"
				aria-pressed={value === "pane"}
				onClick={() => onChange("pane")}
			>
				<PanelTopIcon aria-hidden="true" /> Pane
			</button>
			<button
				type="button"
				aria-pressed={value === "card"}
				onClick={() => onChange("card")}
			>
				<SquareIcon aria-hidden="true" /> Card
			</button>
		</fieldset>
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
						die <LinkedWord>Dämmerung</LinkedWord>
						<span>, die Dämmerungen</span>
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
						aria-label="Open this note in a new pane"
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
							Die <LinkedWord>Dämmerung</LinkedWord> legte sich
							langsam über den See, und am gegenüberliegenden Ufer
							gingen die ersten Lichter an.
						</blockquote>
						<blockquote>
							Wir machten uns noch vor der{" "}
							<LinkedWord>Dämmerung</LinkedWord> auf den Rückweg,
							damit wir den schmalen Pfad erkennen konnten.
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
								<LinkedWord>Zwielicht</LinkedWord>,{" "}
								<LinkedWord>Abenddämmerung</LinkedWord>
							</span>
						</li>
						<li>
							<RelationMark>≈</RelationMark>
							<span>
								<LinkedWord>Abendlicht</LinkedWord>,{" "}
								<LinkedWord>Halbdunkel</LinkedWord>
							</span>
						</li>
						<li>
							<RelationMark>≠</RelationMark>
							<span>
								<LinkedWord>Dunkelheit</LinkedWord>,{" "}
								<LinkedWord>Tageslicht</LinkedWord>
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
								die <LinkedWord>Dämmerung</LinkedWord>, die
								Dämmerungen
							</dd>
						</div>
						<div>
							<dt>A</dt>
							<dd>
								die <LinkedWord>Dämmerung</LinkedWord>, die
								Dämmerungen
							</dd>
						</div>
						<div>
							<dt>G</dt>
							<dd>
								der <LinkedWord>Dämmerung</LinkedWord>, der
								Dämmerungen
							</dd>
						</div>
						<div>
							<dt>D</dt>
							<dd>
								der <LinkedWord>Dämmerung</LinkedWord>, den
								Dämmerungen
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

function LinkedWord({ children }: { readonly children: ReactNode }) {
	return (
		<button type="button" className="linked-word">
			{children}
		</button>
	);
}

function RelationMark({ children }: { readonly children: ReactNode }) {
	return <b className="relation-mark">{children}</b>;
}
