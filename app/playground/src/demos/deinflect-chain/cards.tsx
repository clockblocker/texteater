import { cn, DensityScope, Ipa, LinkButton, NoteTags, NoteTitle } from "lego";
import { Maximize2 } from "lucide-react";
import type { ReactNode } from "react";
import { langAttrs } from "@/fixtures";
import type { DemoCase, HeadPart } from "./cases";
import type { ChainOrder, StepNames } from "./chain";
import { ChainLine, StepList, StepNote } from "./chain-view";

/**
 * The Surface Card with its chain, and the lemma's Reading Card, in
 * lemma-hop's look: the same surface, kind label, headword, IPA and
 * quiet tag row. Only the chain is new.
 */

const surface =
	"rounded-xl border border-line bg-paper text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]";

/** How the chain is drawn: the inspector's knobs. */
export type Look = {
	/** Folded on a line, Yomitan's or 10ten's, or unfolded into a list. */
	readonly layout: "yomitan" | "tenten" | "list";
	readonly order: ChainOrder;
	readonly names: StepNames;
	/** Whether a folded step names its word first. */
	readonly cues: boolean;
	/** Whether every unfolded row says what it means, unasked. */
	readonly explained: boolean;
};

/**
 * The Surface Card for the clicked words: what they are, the lemma they
 * lead to, and the chain of steps between them. A step that is open
 * marks its words in the headword.
 */
export function SurfaceCard({
	demoCase,
	look,
	open,
	onOpen,
	onLemma,
	action,
}: {
	readonly demoCase: DemoCase;
	readonly look: Look;
	readonly open: string | null;
	readonly onOpen: (id: string | null) => void;
	readonly onLemma: () => void;
	readonly action?: ReactNode;
}) {
	const { lemma, steps } = demoCase;
	const openStep = steps.find((step) => step.id === open) ?? null;
	const chain = {
		steps,
		order: look.order,
		names: look.names,
		open,
		onOpen,
	};
	return (
		<DensityScope
			density="compact"
			className={cn(surface, "relative grid gap-3 p-4 text-sm")}
		>
			{action ? (
				<div className="absolute end-1.5 top-1.5">{action}</div>
			) : null}
			<header className={cn("grid gap-1", action && "pe-6")}>
				<span
					{...langAttrs("en")}
					className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase"
				>
					Surface
				</span>
				<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<NoteTitle {...langAttrs("de")} className="text-lg">
						<MarkedWords
							text={demoCase.surface}
							marked={openStep?.words ?? []}
						/>
					</NoteTitle>
					<Ipa
						lang="de-fonipa"
						dir="ltr"
						transcription={demoCase.surfaceIpa}
					/>
				</div>
			</header>
			<div className="grid gap-1.5">
				<p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
					<LinkButton
						{...langAttrs("de")}
						tone={lemma.tone ?? "link"}
						onClick={onLemma}
						className="text-base"
					>
						<span
							aria-hidden="true"
							className="me-1 text-ink-faint"
						>
							→
						</span>
						<LemmaHead head={lemma.head} />
					</LinkButton>
					<span
						{...langAttrs("en")}
						className="text-xs text-ink-muted"
					>
						{lemma.kind}
					</span>
					{look.layout === "tenten" ? (
						<ChainLine {...chain} style="tenten" cues={look.cues} />
					) : null}
				</p>
				{look.layout === "yomitan" ? (
					<ChainLine {...chain} style="yomitan" cues={look.cues} />
				) : null}
			</div>
			{look.layout === "list" ? (
				<StepList {...chain} explained={look.explained} />
			) : null}
			<p className="text-ink-soft">
				<span {...langAttrs("en")}>‘{lemma.gloss}’</span>
			</p>
			{openStep && look.layout !== "list" ? (
				<StepNote
					step={openStep}
					order={look.order}
					names={look.names}
					onClose={() => onOpen(null)}
				/>
			) : null}
		</DensityScope>
	);
}

/** The headword with each word in `marked` underlined. */
function MarkedWords({
	text,
	marked,
}: {
	readonly text: string;
	readonly marked: readonly string[];
}) {
	return (
		<>
			{text.split(" ").map((word, index) => (
				<span key={`${index}:${word}`}>
					{index > 0 ? " " : null}
					<span
						className={cn(
							marked.includes(word) &&
								"underline decoration-link decoration-[0.11em] underline-offset-[0.18em]",
						)}
					>
						{word}
					</span>
				</span>
			))}
		</>
	);
}

/**
 * The lemma's headword with its slots: `mit jM zu tun haben`, the slot
 * quiet and italic, its meaning on hover.
 */
export function LemmaHead({ head }: { readonly head: readonly HeadPart[] }) {
	// One span, so a flex parent (the link) keeps the spaces inside it.
	return (
		<span>
			{head.map((part, index) =>
				"slot" in part ? (
					<abbr
						key={`${index}:${part.slot}`}
						title={part.means}
						className="text-[0.92em] italic no-underline opacity-75"
					>
						{part.slot}
					</abbr>
				) : (
					<span key={`${index}:${part.text}`}>{part.text}</span>
				),
			)}
		</span>
	);
}

/**
 * The lemma's Reading Card, in lemma-hop's quiet design: emoji, headword
 * and IPA, the gloss and the definition, and the tag row closing it.
 */
export function ReadingCard({ demoCase }: { readonly demoCase: DemoCase }) {
	const { lemma } = demoCase;
	return (
		<DensityScope
			density="compact"
			className={cn(surface, "grid gap-4 p-4 text-sm")}
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
					<LemmaHead head={lemma.head} />
				</NoteTitle>
				<Ipa lang="de-fonipa" dir="ltr" transcription={lemma.ipa} />
			</header>
			<div className="grid gap-1.5">
				<p className="text-ink-soft">
					<span {...langAttrs("en")}>‘{lemma.gloss}’</span>
				</p>
				<p>
					<i {...langAttrs("de")}>{lemma.definition}</i>
				</p>
			</div>
			<NoteTags {...langAttrs("en")} className="mt-0 compact:mt-0">
				{lemma.tags.map((tag) => (
					<span key={tag}>{tag}</span>
				))}
			</NoteTags>
		</DensityScope>
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
