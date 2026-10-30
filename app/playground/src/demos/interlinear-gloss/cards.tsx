import {
	cn,
	DensityScope,
	LinkButton,
	NoteSection,
	NoteTags,
	NoteTitle,
} from "lego";
import { ArrowRight, Maximize2 } from "lucide-react";
import { langAttrs } from "@/fixtures";
import { Alignment, type GlossKnobs, toneClass } from "./alignment";
import { abbreviations, type GlossCase, unitOf } from "./cases";
import { ClauseGloss } from "./clause";
import { labelsOf, noteFor, notesOf } from "./focus";
import { AbbreviationKey } from "./gloss-text";

const surface =
	"rounded-xl border border-line bg-paper text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]";

type Shared = {
	readonly glossCase: GlossCase;
	readonly knobs: GlossKnobs;
	readonly focus: string | null;
	readonly onFocus: (key: string) => void;
	readonly onHover: (key: string | null) => void;
	/** Follows the route to the lemma. */
	readonly onFollow: () => void;
};

/** The words' text as the Surface's title, for whoever reads it aloud. */
const unitText = (glossCase: GlossCase) =>
	unitOf(glossCase)
		.map((column) => column.word)
		.join(" ");

/**
 * The Surface popover: the clicked words glossed into their lemma, the
 * focused word's note under the gloss, and tf-demo's route to the lemma.
 * The gloss's top row is the words themselves, so it stands in for the
 * title; the title stays for assistive tech.
 */
export function SurfaceCard({
	note,
	onOpenSheet,
	...shared
}: Shared & {
	/** Show the focused word's note under the gloss. */
	readonly note: boolean;
	readonly onOpenSheet: () => void;
}) {
	const { glossCase, knobs, focus } = shared;
	return (
		<DensityScope
			density="compact"
			className={cn(surface, "relative grid gap-3 p-4 text-sm")}
		>
			<div className="absolute end-1.5 top-1.5">
				<OpenAsSheet onClick={onOpenSheet} />
			</div>
			<header className="pe-6">
				<KindLabel />
				<NoteTitle {...langAttrs("de")} className="sr-only">
					{unitText(glossCase)}
				</NoteTitle>
			</header>
			<Alignment size="card" {...shared} />
			{note ? (
				<FocusNote glossCase={glossCase} focus={focus} knobs={knobs} />
			) : null}
			<RouteLine glossCase={glossCase} onFollow={shared.onFollow} />
		</DensityScope>
	);
}

/** What the focused word explains, with the labels its gloss uses. */
function FocusNote({
	glossCase,
	focus,
	knobs,
}: {
	readonly glossCase: GlossCase;
	readonly focus: string | null;
	readonly knobs: GlossKnobs;
}) {
	const shown = noteFor(glossCase, focus);
	if (!shown) return null;
	return (
		<div
			aria-live="polite"
			className="grid gap-1.5 border-t border-dashed border-line pt-3 leading-relaxed"
		>
			<p {...langAttrs("en")} className="text-ink-soft">
				<b {...langAttrs("de")} className="font-semibold text-ink">
					{shown.word}
				</b>{" "}
				{shown.note}
			</p>
			{knobs.style === "leipzig" ? (
				<AbbreviationKey
					labels={shown.labels}
					meanings={abbreviations}
					className="text-xs"
				/>
			) : null}
		</div>
	);
}

/** tf-demo's route from the Surface to its lemma: `→ mit jM zu tun haben`. */
function RouteLine({
	glossCase,
	onFollow,
}: {
	readonly glossCase: GlossCase;
	readonly onFollow: () => void;
}) {
	const { lemma } = glossCase;
	return (
		<p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
			<LinkButton
				{...langAttrs("de")}
				tone={lemma.tone ?? "link"}
				onClick={onFollow}
				className="font-[570]"
			>
				<ArrowRight aria-hidden="true" className="rtl:-scale-x-100" />
				{lemma.title}
			</LinkButton>
			<span {...langAttrs("en")} className="text-xs text-ink-muted">
				{lemma.family} · {lemma.kind}
			</span>
		</p>
	);
}

/**
 * The Surface in the Sheet, with the room a Card lacks: the same gloss,
 * larger; the whole clause glossed with its free translation, where `es`
 * and `damit` show what they stand for; every word's note; and the
 * glosses' abbreviations, as a glossed paper lists them.
 */
export function SurfacePage(shared: Shared) {
	const { glossCase, knobs, focus, onFocus } = shared;
	const notes = notesOf(glossCase);
	return (
		<DensityScope density="comfortable" className="grid gap-4 text-sm">
			<header>
				<KindLabel />
				<NoteTitle {...langAttrs("de")} className="sr-only">
					{unitText(glossCase)}
				</NoteTitle>
			</header>
			<Alignment size="sheet" {...shared} />
			<RouteLine glossCase={glossCase} onFollow={shared.onFollow} />
			<NoteSection label="Sentence">
				<ClauseGloss
					glossCase={glossCase}
					knobs={knobs}
					focus={focus}
					onFocus={onFocus}
				/>
			</NoteSection>
			<NoteSection label="Word by word">
				<ul className="grid gap-1">
					{notes.map((each) => {
						const on = each.key === focus;
						return (
							<li key={each.key}>
								<button
									type="button"
									aria-pressed={on}
									onClick={() => onFocus(each.key)}
									className={cn(
										"-mx-2 w-[calc(100%+1rem)] cursor-pointer rounded-md px-2 py-1.5 text-start leading-relaxed transition-colors",
										on
											? "bg-link/10 text-ink"
											: "text-ink-soft hover:bg-canvas",
									)}
								>
									<span {...langAttrs("en")}>
										<b
											{...langAttrs("de")}
											className={cn(
												"font-semibold",
												on ? "text-link" : "text-ink",
												toneClass(glossCase),
											)}
										>
											{each.word}
										</b>{" "}
										{each.note}
									</span>
								</button>
							</li>
						);
					})}
				</ul>
			</NoteSection>
			{knobs.style === "leipzig" ? (
				<NoteSection label="Abbreviations">
					<AbbreviationKey
						labels={labelsOf(glossCase)}
						meanings={abbreviations}
						className="text-xs leading-relaxed"
					/>
				</NoteSection>
			) : null}
		</DensityScope>
	);
}

/** The lemma's own page, one Cover up from the Surface. */
export function LemmaPage({ glossCase }: { readonly glossCase: GlossCase }) {
	const { lemma } = glossCase;
	return (
		<DensityScope
			density="compact"
			className={cn(surface, "grid gap-3 p-4 text-sm")}
		>
			<header className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
				<span aria-hidden="true" className="text-xl">
					{lemma.emoji}
				</span>
				<NoteTitle
					{...langAttrs("de")}
					tone={lemma.tone}
					className="text-lg"
				>
					{lemma.title}
				</NoteTitle>
			</header>
			<p className="text-ink-soft">
				<span {...langAttrs("en")}>{lemma.translation}</span>
			</p>
			<p>
				<span {...langAttrs("de")}>{lemma.definition}</span>
			</p>
			<NoteTags {...langAttrs("en")} className="mt-0 compact:mt-0">
				{lemma.tags.map((tag) => (
					<span key={tag}>{tag}</span>
				))}
			</NoteTags>
		</DensityScope>
	);
}

function KindLabel() {
	return (
		<span
			{...langAttrs("en")}
			className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase"
		>
			Surface
		</span>
	);
}

/** lemma-hop's corner button, copied: open the popover as a Sheet. */
function OpenAsSheet({ onClick }: { readonly onClick: () => void }) {
	return (
		<button
			type="button"
			title="Open as Sheet"
			aria-label="Open as Sheet"
			onClick={onClick}
			className="grid size-7 cursor-pointer place-items-center rounded-md text-ink-faint hover:bg-canvas hover:text-ink"
		>
			<Maximize2
				aria-hidden="true"
				className="size-3.5 rtl:-scale-x-100"
			/>
		</button>
	);
}
