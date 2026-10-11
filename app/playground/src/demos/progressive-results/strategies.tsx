import { cn, Ipa, NoteBone, NoteTitle, NoteTitleLink } from "lego";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";
import {
	type CardKind,
	CardView,
	cardKinds,
	type FakeCard,
	type FakeResolution,
} from "@/fixtures";
import { usePlaygroundEnv } from "@/shell";
import {
	FailedCard,
	FailedTail,
	fullCard,
	KindLabel,
	PartialCard,
	RetryButton,
	Section,
	SkeletonCard,
	SkeletonTail,
	surface,
} from "./pieces";
import type { StageState } from "./use-staged-lookup";

export type Strategy = "skeletons" | "deal" | "grow";

type Stages = Readonly<Record<CardKind, StageState>>;

type StrategyProps = {
	readonly resolution: FakeResolution;
	readonly stages: Stages;
	readonly retry: (kind: CardKind) => void;
};

/** One slot of the pile: how it looks as a tail and at the front. */
type PileItem = {
	readonly kind: CardKind;
	readonly tail: (onFront: () => void) => ReactNode;
	readonly full: ReactNode;
};

const deal = { type: "spring", duration: 0.35, bounce: 0 } as const;

/**
 * The deal spring, or none under reduced motion: Motion's reduced mode
 * skips transforms and layout but still tweens height and opacity.
 */
function useDealTransition() {
	return usePlaygroundEnv().reducedMotion ? { duration: 0 } : deal;
}

/**
 * The Deck as `CardStack` piles it: the front Card in full, the ones
 * behind it as tails above, each a little narrower. Clicking a tail pins
 * it to the front, which hides the Cards after it, as in `CardStack`.
 * Positions animate; sizes snap, so every height change is visible as one.
 */
function Pile({
	items,
	enterY,
}: {
	readonly items: readonly PileItem[];
	/** How far a newly dealt Card slides in from, in px. */
	readonly enterY: number;
}) {
	const transition = useDealTransition();
	const slide = usePlaygroundEnv().reducedMotion ? 0 : enterY;
	const [pinned, setPinned] = useState<CardKind | null>(null);
	const pinnedIndex = items.findIndex((item) => item.kind === pinned);
	const frontIndex = pinnedIndex === -1 ? items.length - 1 : pinnedIndex;
	const shown = items.slice(0, frontIndex + 1);
	const hidden = items.length - shown.length;

	return (
		<div className="flex flex-col">
			<AnimatePresence>
				{shown.map((item, index) => {
					const depth = shown.length - 1 - index;
					// A new Card starts at its place; a Card moving back animates.
					const margins = {
						marginInline: Math.min(depth, 4) * 8,
						marginBottom: depth > 0 ? -6 : 0,
					};
					return (
						<motion.div
							key={item.kind}
							layout="position"
							data-front={depth === 0 ? "true" : undefined}
							initial={{ opacity: 0, y: slide, ...margins }}
							animate={{ opacity: 1, y: 0, ...margins }}
							exit={{
								opacity: 0,
								height: 0,
								marginBottom: 0,
								overflow: "hidden",
							}}
							transition={transition}
							style={{ zIndex: index }}
							className="relative"
						>
							{depth > 0
								? item.tail(() => setPinned(item.kind))
								: item.full}
						</motion.div>
					);
				})}
			</AnimatePresence>
			{hidden > 0 ? (
				<button
					type="button"
					onClick={() => setPinned(null)}
					className="mt-2 cursor-pointer self-start text-sm text-link hover:underline"
				>
					Show the newest Card ({hidden} hidden in front)
				</button>
			) : null}
		</div>
	);
}

function readyItem(card: FakeCard): PileItem {
	return {
		kind: card.kind,
		tail: (onFront) => (
			<CardView
				card={card}
				collapsed
				onTailClick={onFront}
				className="pb-3"
			/>
		),
		full: <CardView card={card} />,
	};
}

function failedItem(kind: CardKind, retry: (kind: CardKind) => void): PileItem {
	return {
		kind,
		tail: (onFront) => (
			<FailedTail
				kind={kind}
				onFront={onFront}
				onRetry={() => retry(kind)}
			/>
		),
		full: <FailedCard kind={kind} onRetry={() => retry(kind)} />,
	};
}

/**
 * (a) Every slot is there from the click on, as a skeleton, and fills in
 * place when its stage settles. An empty stage folds its slot away.
 */
export function AllSkeletons({ stages, retry }: StrategyProps) {
	const items = cardKinds.flatMap((kind): PileItem[] => {
		const stage = stages[kind];
		switch (stage.status) {
			case "empty":
				return [];
			case "ready":
				return [readyItem(stage.card)];
			case "failed":
				return [failedItem(kind, retry)];
			default:
				return [
					{
						kind,
						tail: () => <SkeletonTail kind={kind} />,
						full: <SkeletonCard kind={kind} />,
					},
				];
		}
	});
	// Slots appear together at the click, without sliding, so the only
	// moves are the ones the strategy causes.
	return <Pile items={items} enterY={0} />;
}

/**
 * (b) A Card is dealt only once it has something to show: its heading
 * first, with skeleton blocks for the body until the stage settles.
 */
export function DealAsReady({ stages, retry }: StrategyProps) {
	const items = cardKinds.flatMap((kind): PileItem[] => {
		const stage = stages[kind];
		switch (stage.status) {
			case "partial":
				return [
					{
						kind,
						tail: (onFront) => (
							<CardView
								card={stage.card}
								collapsed
								onTailClick={onFront}
								className="pb-3"
							/>
						),
						full: <PartialCard card={stage.card} />,
					},
				];
			case "ready":
				return [readyItem(stage.card)];
			case "failed":
				return [failedItem(kind, retry)];
			default:
				return [];
		}
	});
	return <Pile items={items} enterY={12} />;
}

/**
 * (c) One Card for the click, which grows a section per stage as each
 * settles, in deal order, so new content lands below what is being read.
 */
export function SingleGrowing({ resolution, stages, retry }: StrategyProps) {
	const transition = useDealTransition();
	const waiting = cardKinds.filter((kind) => {
		const status = stages[kind].status;
		return status === "waiting" || status === "partial";
	});
	return (
		<div data-front="true" className={cn(surface, fullCard)}>
			<header className="grid gap-1">
				<span className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase">
					Lookup
				</span>
				<NoteTitle className="text-lg">{resolution.word}</NoteTitle>
			</header>
			<AnimatePresence initial={false}>
				{cardKinds.map((kind) => {
					const stage = stages[kind];
					if (stage.status !== "ready" && stage.status !== "failed")
						return null;
					return (
						<motion.div
							key={kind}
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={transition}
							className="overflow-hidden"
						>
							{stage.status === "ready" ? (
								<GrowingSection card={stage.card} />
							) : (
								<Section kind={kind}>
									<p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-soft">
										This stage failed.
										<RetryButton
											kind={kind}
											onRetry={() => retry(kind)}
										/>
									</p>
								</Section>
							)}
						</motion.div>
					);
				})}
			</AnimatePresence>
			{waiting.length > 0 ? (
				<div
					role="status"
					aria-label={`${waiting.join(", ")} on the way`}
					className="grid gap-1 border-line border-t pt-3"
				>
					<KindLabel kind={waiting[0] ?? "Reading"} />
					<NoteBone className="w-3/4" />
				</div>
			) : null}
		</div>
	);
}

/** Its lemma links do nothing: the Deck never changes in place. */
function GrowingSection({ card }: { readonly card: FakeCard }) {
	const links = card.links.map((link) => (
		<span key={link.word} className="text-ink-muted">
			{link.relation} →{" "}
			<NoteTitleLink className="text-link">{link.word}</NoteTitleLink>
		</span>
	));
	switch (card.kind) {
		case "Attestation":
			return (
				<Section kind={card.kind}>
					{card.quote ? (
						<blockquote className="border-s-[3px] border-line ps-3 text-ink-soft">
							<Marked
								quote={card.quote}
								marks={card.quoteMarks}
							/>
						</blockquote>
					) : (
						<p className="text-ink-soft">{card.definition}</p>
					)}
				</Section>
			);
		case "Surface":
			return (
				<Section kind={card.kind}>
					<p className="text-ink-muted">{card.caption}</p>
					<p>{card.definition}</p>
					<p>{links}</p>
				</Section>
			);
		case "Lemma":
			return (
				<Section kind={card.kind}>
					<div className="flex flex-wrap items-baseline gap-x-3">
						<NoteTitle>{card.title}</NoteTitle>
						<Ipa transcription={card.ipa} />
					</div>
					<p>{card.definition}</p>
				</Section>
			);
		case "Reading":
			return (
				<Section kind={card.kind}>
					<p className="flex items-baseline gap-2">
						<span aria-hidden="true" className="text-xl">
							{card.emoji}
						</span>
						<span className="text-ink-muted">{card.caption}</span>
					</p>
					<p className="text-ink-soft">
						{card.translations.join(", ")}
					</p>
					<p>{card.definition}</p>
				</Section>
			);
	}
}

/** The quote with the clicked words in the link colour. */
function Marked({
	quote,
	marks,
}: {
	readonly quote: string;
	readonly marks: readonly string[];
}) {
	const parts = quote.split(/(\p{L}+)/u);
	return (
		<>
			{parts.map((part, index) =>
				marks.includes(part) ? (
					<span key={index} className="text-link">
						{part}
					</span>
				) : (
					part
				),
			)}
		</>
	);
}
