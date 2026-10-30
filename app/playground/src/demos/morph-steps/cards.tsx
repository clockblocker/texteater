import { cn, DensityScope, Ipa, LinkButton, NoteTags, NoteTitle } from "lego";
import { Maximize2 } from "lucide-react";
import type { ReactNode } from "react";
import { langAttrs } from "@/fixtures";
import type { MorphCase } from "./cases";
import { slotClass } from "./stage";
import { captionRuns } from "./timeline";
import type { Playback } from "./use-playback";

const surface =
	"rounded-xl border border-line bg-paper text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]";

/**
 * The Surface Card, as lemma-hop's `FullCard` draws it: its kind, the
 * clicked words and what they are of, then the metamorphosis (`stage`)
 * where the quote and definition would go, and the route to the lemma
 * last, the lemma the stage ends on. `action` sits in the top corner.
 */
export function SurfaceCard({
	morph,
	stage,
	action,
	onLemma,
	large = false,
}: {
	readonly morph: MorphCase;
	readonly stage: ReactNode;
	readonly action?: ReactNode;
	readonly onLemma: () => void;
	/** In a Sheet, which has the room: a bigger title. */
	readonly large?: boolean;
}) {
	return (
		<DensityScope
			density="compact"
			className={cn(surface, "relative grid gap-3 p-4 text-sm")}
		>
			{action ? (
				<div className="absolute end-1.5 top-1.5">{action}</div>
			) : null}
			<header className={cn("grid gap-1", action && "pe-6")}>
				<KindLabel>Surface</KindLabel>
				<NoteTitle
					{...langAttrs("de")}
					className={large ? "text-2xl" : "text-lg"}
				>
					{morph.surface.title}
				</NoteTitle>
				<p className="text-ink-muted">
					<span {...langAttrs("en")}>{morph.surface.caption}</span>
				</p>
			</header>
			{stage}
			<LemmaRoute morph={morph} onClick={onLemma} />
		</DensityScope>
	);
}

/** tf-demo's analysis line: `→ mit jM zu tun haben  Locution · VERB`. */
function LemmaRoute({
	morph,
	onClick,
}: {
	readonly morph: MorphCase;
	readonly onClick: () => void;
}) {
	return (
		<div className="grid gap-0.5 border-t border-dashed border-line pt-3">
			<div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
				<LinkButton
					{...langAttrs("de")}
					tone={morph.lemma.tone ?? "link"}
					onClick={onClick}
					className="text-base font-[570]"
				>
					<span aria-hidden="true" className="me-1.5 text-ink-faint">
						→
					</span>
					<LemmaHeadword morph={morph} />
				</LinkButton>
				<span {...langAttrs("en")} className="text-xs text-ink-muted">
					{morph.lemma.kind}
				</span>
			</div>
			<p {...langAttrs("en")} className="text-ink-soft">
				{morph.lemma.gloss}
			</p>
		</div>
	);
}

/** The lemma's header: an article dim, a slot in its dashed box. */
export function LemmaHeadword({ morph }: { readonly morph: MorphCase }) {
	return (
		<span>
			{morph.lemma.runs.map((run, index) => (
				<span key={`${index}:${run.text}`}>
					{index > 0 ? " " : null}
					<span
						className={cn(
							run.slot && cn(slotClass, "text-ink-soft"),
							run.article && "font-normal text-ink-faint",
						)}
					>
						{run.text}
					</span>
				</span>
			))}
		</span>
	);
}

/** The Lemma Card, for the Sheet's Lemma Cover. */
export function LemmaCard({ morph }: { readonly morph: MorphCase }) {
	const { lemma } = morph;
	return (
		<DensityScope
			density="compact"
			className={cn(surface, "grid gap-3 p-4 text-sm")}
		>
			<header className="grid gap-1">
				<KindLabel>Lemma</KindLabel>
				<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span aria-hidden="true" className="text-xl">
						{lemma.emoji}
					</span>
					<NoteTitle
						{...langAttrs("de")}
						tone={lemma.tone}
						className="text-lg"
					>
						<LemmaHeadword morph={morph} />
					</NoteTitle>
					{lemma.ipa ? (
						<Ipa
							lang="de-fonipa"
							dir="ltr"
							transcription={lemma.ipa}
						/>
					) : null}
				</div>
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
		</DensityScope>
	);
}

function KindLabel({ children }: { readonly children: ReactNode }) {
	return (
		<span
			{...langAttrs("en")}
			className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase"
		>
			{children}
		</span>
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
 * build: the Sheet has the room. The shown step stands out; a step jumps
 * the stage to it.
 */
export function StepList({
	morph,
	playback,
}: {
	readonly morph: MorphCase;
	readonly playback: Playback;
}) {
	return (
		<ol {...langAttrs("en")} className="grid gap-0.5">
			{morph.frames.map((frame, index) => (
				<li key={frame.caption}>
					<button
						type="button"
						aria-current={
							index === playback.at ? "step" : undefined
						}
						onClick={() => playback.go(index)}
						className={cn(
							"grid w-full cursor-pointer grid-cols-[1.5rem_1fr] items-baseline rounded-md px-2 py-1.5 text-start text-sm transition-colors",
							index === playback.at
								? "bg-link/10 text-ink"
								: index < playback.at
									? "text-ink-soft hover:bg-paper"
									: "text-ink-muted hover:bg-paper",
						)}
					>
						<span
							className={cn(
								"font-mono text-xs tabular-nums",
								index === playback.at
									? "text-link"
									: "text-ink-faint",
							)}
						>
							{index + 1}
						</span>
						<span>
							{captionRuns(frame.caption).map((run, at) =>
								run.german ? (
									<i key={`${at}:${run.text}`} lang="de">
										{run.text}
									</i>
								) : (
									<span key={`${at}:${run.text}`}>
										{run.text}
									</span>
								),
							)}
						</span>
					</button>
				</li>
			))}
		</ol>
	);
}
