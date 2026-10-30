import {
	cn,
	DensityScope,
	Ipa,
	LinkButton,
	NoteTags,
	NoteTitle,
	NoteTitleRow,
} from "lego";
import { Maximize2 } from "lucide-react";
import { Fragment, type ReactNode } from "react";
import { langAttrs } from "@/fixtures";
import { type LineRun, lineText, type MorphCase } from "./cases";
import type { CardKind } from "./deck";
import { kindLabelClass, slotClass } from "./stage";
import { type Beat, captionRuns } from "./timeline";
import type { Playback } from "./use-playback";

const cardSurface =
	"rounded-xl border border-line bg-paper text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]";

/** In the Deck a Card's caption ends at its relation; a Sheet names the next. */
export type Presentation = "card" | "sheet";

/** A piece of the Attestation's title: one word of the unit. */
export type TitleWord = {
	readonly id: string;
	readonly text: string;
	readonly clicked: boolean;
};

/**
 * The Attestation Card, headed as tf-demo heads it: the unit's words as
 * written, the clicked one standing out, and `split form of`. Its body is
 * Syntax, a stage (`stage`) or one still line, and it ends on the route to
 * the Surface, the line Syntax ends on.
 */
export function AttestationCard({
	morph,
	title,
	presentation,
	stage,
	action,
	onSurface,
}: {
	readonly morph: MorphCase;
	readonly title: readonly TitleWord[];
	readonly presentation: Presentation;
	readonly stage: ReactNode;
	readonly action?: ReactNode;
	readonly onSurface: () => void;
}) {
	const { syntax } = morph.attestation;
	return (
		<CardFrame action={action}>
			<Heading
				title={<AttestationTitle words={title} />}
				caption={morph.attestation.caption}
				next={lineText(morph.surface.line)}
				presentation={presentation}
			/>
			{syntax.kind === "still" ? (
				<p {...langAttrs("en")} className="text-pretty text-ink-soft">
					<CaptionText caption={syntax.line} />
				</p>
			) : (
				stage
			)}
			<Route
				onClick={onSurface}
				title={<LineView runs={morph.surface.line} />}
				aside={morph.surface.aside}
			/>
		</CardFrame>
	);
}

/**
 * The Surface Card, headed by its slotted line in tf-demo's valency
 * styles, `jD mit jM zu tun hatte · past of`; its body is Inflection, and
 * it ends on the route to the Lemma, the line Inflection ends on.
 */
export function SurfaceCard({
	morph,
	presentation,
	stage,
	action,
	onLemma,
}: {
	readonly morph: MorphCase;
	readonly presentation: Presentation;
	readonly stage: ReactNode;
	readonly action?: ReactNode;
	readonly onLemma: () => void;
}) {
	return (
		<CardFrame action={action}>
			<Heading
				title={<LineView runs={morph.surface.line} />}
				caption={morph.surface.caption}
				next={lineText(morph.lemma.runs)}
				presentation={presentation}
			/>
			{stage}
			<Route
				onClick={onLemma}
				tone={morph.lemma.tone}
				title={<LineView runs={morph.lemma.runs} />}
				aside={morph.lemma.kind}
				gloss={morph.lemma.gloss}
			/>
		</CardFrame>
	);
}

/** The Lemma Card, where the Surface Card's route leads. */
export function LemmaCard({
	morph,
	action,
}: {
	readonly morph: MorphCase;
	readonly action?: ReactNode;
}) {
	const { lemma } = morph;
	return (
		<CardFrame action={action}>
			<header
				className={cn("flex flex-wrap items-baseline gap-x-3 gap-y-1")}
			>
				<span aria-hidden="true" className="text-xl">
					{lemma.emoji}
				</span>
				<NoteTitle {...langAttrs("de")} tone={lemma.tone}>
					<LineView runs={lemma.runs} />
				</NoteTitle>
				{lemma.ipa ? (
					<Ipa lang="de-fonipa" dir="ltr" transcription={lemma.ipa} />
				) : null}
			</header>
			<p {...langAttrs("en")} className="text-ink-soft">
				{lemma.gloss}
			</p>
			<p {...langAttrs(lemma.definitionLang)}>{lemma.definition}</p>
			<NoteTags {...langAttrs("en")} className="mt-0 compact:mt-0">
				{lemma.kind.split(" · ").map((tag) => (
					<span key={tag}>{tag}</span>
				))}
			</NoteTags>
		</CardFrame>
	);
}

/**
 * A Card behind or after the front one, as its one-row tail: its heading,
 * the caption ending at its relation. A tail brings its Card forward.
 */
export function DeckTail({
	morph,
	title,
	kind,
	before,
	onClick,
}: {
	readonly morph: MorphCase;
	readonly title: readonly TitleWord[];
	readonly kind: CardKind;
	/** Above the front Card, rather than tucked under it. */
	readonly before: boolean;
	readonly onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={cn(
				cardSurface,
				"flex w-full min-w-0 cursor-pointer items-baseline gap-1.5 px-3 py-1.5 text-start text-sm text-ink-soft hover:text-ink",
				before ? "pb-3" : "pt-3",
			)}
		>
			{kind === "attestation" ? (
				<TailRow
					title={<AttestationTitle words={title} />}
					caption={morph.attestation.caption}
				/>
			) : kind === "surface" ? (
				<TailRow
					title={<LineView runs={morph.surface.line} />}
					caption={morph.surface.caption}
				/>
			) : (
				<TailRow
					lead={morph.lemma.emoji}
					title={<LineView runs={morph.lemma.runs} />}
				/>
			)}
		</button>
	);
}

/** A tail's row: the Card's heading, cut to one line. */
function TailRow({
	title,
	caption,
	lead,
}: {
	readonly title: ReactNode;
	readonly caption?: string | null;
	readonly lead?: string;
}) {
	return (
		<>
			{lead ? <span aria-hidden="true">{lead}</span> : null}
			<span {...langAttrs("de")} className="shrink-0 font-[570] text-ink">
				{title}
			</span>
			{caption ? (
				<span
					{...langAttrs("en")}
					className="min-w-0 flex-[1_1_0] truncate text-ink-muted"
				>
					<span aria-hidden="true" className="me-1.5 text-ink-faint">
						·
					</span>
					{caption}
				</span>
			) : null}
		</>
	);
}

function CardFrame({
	action,
	children,
}: {
	readonly action?: ReactNode;
	readonly children: ReactNode;
}) {
	return (
		<DensityScope
			density="compact"
			className={cn(cardSurface, "relative grid gap-3 p-4 text-sm")}
		>
			{action ? (
				<div className="absolute end-1.5 top-1.5">{action}</div>
			) : null}
			<div className={cn("contents", action && "[&>header]:pe-7")}>
				{children}
			</div>
		</DensityScope>
	);
}

/**
 * tf-demo's CaptionedHeading: the title and its caption on one row, the
 * caption truncating. In the Deck the caption ends at its relation, above
 * the route to the next Card; as a Sheet it names the next Card's title.
 */
function Heading({
	title,
	caption,
	next,
	presentation,
}: {
	readonly title: ReactNode;
	readonly caption: string | null;
	readonly next: string;
	readonly presentation: Presentation;
}) {
	return (
		<header className="min-w-0">
			<NoteTitleRow className="flex-nowrap justify-start gap-x-1.5">
				<NoteTitle {...langAttrs("de")}>{title}</NoteTitle>
				{caption ? (
					<span
						{...langAttrs("en")}
						className="min-w-0 flex-[1_1_0] truncate text-sm text-ink-muted"
					>
						<span
							aria-hidden="true"
							className="me-1.5 text-ink-faint"
						>
							·
						</span>
						{caption}
						{presentation === "sheet" ? (
							<>
								{" "}
								<bdi
									{...langAttrs("de")}
									className="text-ink-faint"
								>
									{next}
								</bdi>
							</>
						) : null}
					</span>
				) : null}
			</NoteTitleRow>
		</header>
	);
}

/** tf-demo's unit title: the other words recede so the clicked one stands out. */
function AttestationTitle({ words }: { readonly words: readonly TitleWord[] }) {
	const emphasised = words.length > 1 && words.some((word) => word.clicked);
	return (
		<bdi>
			{words.map((word, index) => (
				<Fragment key={word.id}>
					{index > 0 ? " " : null}
					<span
						className={
							emphasised && !word.clicked
								? "font-[460] text-ink-muted"
								: undefined
						}
					>
						{word.text}
					</span>
				</Fragment>
			))}
		</bdi>
	);
}

/** A line in tf-demo's valency styles: `jD mit jM zu tun hatte`. */
function LineView({ runs }: { readonly runs: readonly LineRun[] }) {
	// One span, so a flex parent such as a link keeps the spaces.
	return (
		<span>
			{runs.map((run, index) => (
				<Fragment key={`${index}:${run.text}`}>
					{index > 0 ? " " : null}
					<span
						className={cn(
							run.style === "preposition" && "italic",
							run.style === "slot" && slotClass,
							run.style === "article" &&
								"font-normal text-ink-faint",
						)}
					>
						{run.text}
					</span>
				</Fragment>
			))}
		</span>
	);
}

/** tf-demo's route line: `→ jD mit jM zu tun hatte  past · 3rd sg`. */
function Route({
	title,
	aside,
	gloss,
	tone,
	onClick,
}: {
	readonly title: ReactNode;
	readonly aside: string;
	readonly gloss?: string;
	readonly tone?: "neuter";
	readonly onClick: () => void;
}) {
	return (
		<div className="grid gap-0.5 border-t border-dashed border-line pt-3">
			<div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
				<LinkButton
					{...langAttrs("de")}
					tone={tone ?? "link"}
					onClick={onClick}
					className="text-base font-[570]"
				>
					<span aria-hidden="true" className="me-1.5 text-ink-faint">
						→
					</span>
					{title}
				</LinkButton>
				<span {...langAttrs("en")} className="text-xs text-ink-muted">
					{aside}
				</span>
			</div>
			{gloss ? (
				<p {...langAttrs("en")} className="text-ink-soft">
					{gloss}
				</p>
			) : null}
		</div>
	);
}

/** A caption's runs: English, and German in italics. */
function CaptionText({ caption }: { readonly caption: string }) {
	return captionRuns(caption).map((run, index) =>
		run.german ? (
			<i key={`${index}:${run.text}`} lang="de" className="text-ink">
				{run.text}
			</i>
		) : (
			<span key={`${index}:${run.text}`}>{run.text}</span>
		),
	);
}

/** The Card's corner button: open it as a Sheet over the reader. */
export function OpenAsSheet({ onClick }: { readonly onClick: () => void }) {
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

/**
 * Every step's caption at once, as Keynote's slide navigator lists a
 * build: the Sheet has the room. The result wears its kind label; the
 * shown step stands out, and a step jumps the stage to it.
 */
export function StepList({
	beats,
	playback,
}: {
	readonly beats: readonly Beat[];
	readonly playback: Playback;
}) {
	return (
		<ol {...langAttrs("en")} className="grid gap-0.5">
			{beats.map((beat, index) => {
				const shown = index === playback.at;
				return (
					<li key={beat.frame.caption}>
						<button
							type="button"
							aria-current={shown ? "step" : undefined}
							onClick={() => playback.go(index)}
							className={cn(
								"grid w-full cursor-pointer grid-cols-[1.5rem_1fr] items-baseline rounded-md px-2 py-1.5 text-start text-sm transition-colors",
								shown
									? "bg-link/10 text-ink"
									: index < playback.at
										? "text-ink-soft hover:bg-paper"
										: "text-ink-muted hover:bg-paper",
							)}
						>
							<span
								className={cn(
									"font-mono text-xs tabular-nums",
									shown ? "text-link" : "text-ink-faint",
								)}
							>
								{index + 1}
							</span>
							<span>
								{beat.result ? (
									<span
										className={cn(kindLabelClass, "me-1.5")}
									>
										{beat.result}
									</span>
								) : null}
								<CaptionText caption={beat.frame.caption} />
							</span>
						</button>
					</li>
				);
			})}
		</ol>
	);
}
