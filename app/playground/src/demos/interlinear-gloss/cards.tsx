import { cn, DensityScope, LinkButton, NoteTags, NoteTitle } from "lego";
import { ArrowRight, Maximize2 } from "lucide-react";
import type { ReactNode } from "react";
import { langAttrs } from "@/fixtures";
import {
	Alignment,
	type FocusHandlers,
	type GlossKnobs,
	toneClass,
} from "./alignment";
import type { CardKind } from "./cases";
import { noteFor } from "./focus";
import { AbbreviationKey, GlossText } from "./gloss-text";
import { SlottedLine } from "./line";
import { abbreviations, type GlossCase, type Step } from "./model";

const cardSurface =
	"rounded-xl border border-line bg-paper text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]";

/** What every Card and Sheet page of a case shares. */
export type CardProps = FocusHandlers & {
	readonly glossCase: GlossCase;
	readonly knobs: GlossKnobs;
	readonly focus: string | null;
	/** Show the focused token's note under the gloss. */
	readonly note: boolean;
	/** Follows the Card's link to the next Card. */
	readonly onFollow: () => void;
};

/** The Surface line as the static Attestation Card's link prints it. */
const surfaceTokens = (glossCase: GlossCase) =>
	glossCase.surface.inflection.columns.map(({ id, word, style }) => ({
		id,
		text: word,
		style,
	}));

/** The Lemma's family and kind, after the link to it. */
const lemmaAside = (glossCase: GlossCase) =>
	`${glossCase.lemma.family} · ${glossCase.lemma.kind}`;

/** One Card in full, by kind, with ⤢ to open it as a Sheet. */
export function DeckCard({
	kind,
	onOpenSheet,
	...props
}: CardProps & {
	readonly kind: CardKind;
	readonly onOpenSheet: () => void;
}) {
	const corner = (
		<div className="absolute end-1.5 top-1.5">
			<OpenAsSheet onClick={onOpenSheet} />
		</div>
	);
	if (kind === "lemma")
		return <LemmaCard glossCase={props.glossCase} corner={corner} />;
	return (
		<DensityScope
			density="compact"
			className={cn(cardSurface, "relative grid gap-3 p-4 text-sm")}
		>
			{corner}
			{kind === "attestation" ? (
				<AttestationBody {...props} size="card" />
			) : (
				<SurfaceBody {...props} size="card" />
			)}
		</DensityScope>
	);
}

/**
 * The Attestation: the words on the page glossed into the Surface line,
 * with the reordering drawn as lines, ending on that line as the link to
 * the Surface Card. With nothing to reorder it is static: the words, the
 * case their context sets, and the link.
 */
export function AttestationBody({
	size,
	...props
}: CardProps & { readonly size: "card" | "sheet" }) {
	const { glossCase, knobs, focus, note, onFollow } = props;
	const { syntax, governor, title } = glossCase.attestation;
	if (!syntax)
		return (
			<>
				<header>
					<KindLabel kind="attestation" />
					<NoteTitle
						{...langAttrs("de")}
						className={size === "sheet" ? "text-xl" : "text-lg"}
					>
						{title}
					</NoteTitle>
				</header>
				{governor ? (
					<p
						{...langAttrs("de")}
						className={cn(
							"flex items-baseline gap-1.5",
							size === "sheet" ? "text-base" : "text-[0.9375rem]",
						)}
					>
						<span className="italic">{governor.word}</span>
						<ArrowRight
							aria-hidden="true"
							className="size-3.5 self-center text-ink-faint rtl:-scale-x-100"
						/>
						<span className="text-ink-soft">
							{knobs.style === "leipzig" ? (
								<GlossText gloss={governor.leipzig} />
							) : (
								<span {...langAttrs("en")}>
									{governor.spelled}
								</span>
							)}
						</span>
					</p>
				) : null}
				{note && governor ? (
					<NoteText word={governor.word}>{governor.note}</NoteText>
				) : null}
				<p>
					<LinkButton
						{...langAttrs("de")}
						onClick={onFollow}
						className="font-[570]"
					>
						<ArrowRight
							aria-hidden="true"
							className="rtl:-scale-x-100"
						/>
						<span>
							<SlottedLine tokens={surfaceTokens(glossCase)} />
						</span>
					</LinkButton>
				</p>
			</>
		);
	return (
		<>
			<Header kind="attestation" title={title} />
			<Alignment
				step={syntax}
				size={size}
				landing={{ onFollow }}
				{...props}
			/>
			{note && size === "card" ? (
				<FocusNote step={syntax} focus={focus} knobs={knobs} />
			) : null}
		</>
	);
}

/**
 * The Surface: its slotted line glossed morpheme by morpheme into the
 * Lemma, ending on the Lemma as the link to the Lemma Card.
 */
export function SurfaceBody({
	size,
	...props
}: CardProps & { readonly size: "card" | "sheet" }) {
	const { glossCase, knobs, focus, note, onFollow } = props;
	const step = glossCase.surface.inflection;
	return (
		<>
			<Header kind="surface" title={glossCase.surface.title} />
			<Alignment
				step={step}
				size={size}
				landing={{
					onFollow,
					tone: glossCase.lemma.tone,
					aside: lemmaAside(glossCase),
				}}
				{...props}
			/>
			{note && size === "card" ? (
				<FocusNote step={step} focus={focus} knobs={knobs} />
			) : null}
		</>
	);
}

/**
 * The kind over a gloss whose top row is the title, so the title itself
 * stays for whoever reads it aloud.
 */
function Header({
	kind,
	title,
}: {
	readonly kind: CardKind;
	readonly title: string;
}) {
	return (
		<header className="pe-6">
			<KindLabel kind={kind} />
			<NoteTitle {...langAttrs("de")} className="sr-only">
				{title}
			</NoteTitle>
		</header>
	);
}

/** What the focused token explains, with the labels its gloss uses. */
function FocusNote({
	step,
	focus,
	knobs,
}: {
	readonly step: Step;
	readonly focus: string | null;
	readonly knobs: GlossKnobs;
}) {
	const shown = noteFor(step, focus);
	if (!shown) return null;
	return (
		<div aria-live="polite" className="grid gap-1.5">
			<NoteText word={shown.word}>{shown.note}</NoteText>
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

function NoteText({
	word,
	children,
}: {
	readonly word: string;
	readonly children: ReactNode;
}) {
	return (
		<p
			{...langAttrs("en")}
			className="border-t border-dashed border-line pt-3 leading-relaxed text-ink-soft"
		>
			<b {...langAttrs("de")} className="font-semibold text-ink">
				{word}
			</b>{" "}
			{children}
		</p>
	);
}

/** The Lemma's own Card, the end of the hop. */
export function LemmaCard({
	glossCase,
	corner,
}: {
	readonly glossCase: GlossCase;
	readonly corner?: ReactNode;
}) {
	const { lemma } = glossCase;
	return (
		<DensityScope
			density="compact"
			className={cn(cardSurface, "relative grid gap-3 p-4 text-sm")}
		>
			{corner}
			<header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pe-6">
				<span aria-hidden="true" className="text-xl">
					{lemma.emoji}
				</span>
				<NoteTitle
					{...langAttrs("de")}
					tone={lemma.tone}
					className="text-lg"
				>
					<SlottedLine
						tokens={glossCase.surface.inflection.targets}
					/>
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

/** A Card behind the front one, as its one-line tail: back to it. */
export function CardTail({
	kind,
	glossCase,
	onClick,
}: {
	readonly kind: CardKind;
	readonly glossCase: GlossCase;
	readonly onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				cardSurface,
				"flex w-full cursor-pointer items-baseline gap-2 px-3 pt-1.5 pb-3 text-start text-sm text-ink-soft hover:text-ink",
				toneClass(kind === "lemma" ? glossCase.lemma.tone : undefined),
			)}
		>
			<KindLabel kind={kind} />
			<span {...langAttrs("de")} className="truncate">
				{kind === "surface" ? (
					<SlottedLine tokens={surfaceTokens(glossCase)} />
				) : kind === "attestation" ? (
					glossCase.attestation.title
				) : (
					glossCase.lemma.title
				)}
			</span>
		</button>
	);
}

const kindLabels: Readonly<Record<CardKind, string>> = {
	attestation: "Attestation",
	surface: "Surface",
	lemma: "Lemma",
};

function KindLabel({ kind }: { readonly kind: CardKind }) {
	return (
		<span
			{...langAttrs("en")}
			className="shrink-0 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase"
		>
			{kindLabels[kind]}
		</span>
	);
}

/** lemma-hop's corner button, copied: open the Card as a Sheet. */
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
