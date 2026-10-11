import { cn, DensityScope, Ipa, NoteTitle, NoteTitleLink } from "lego";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import {
	CardSkeleton,
	CardView,
	type FakeCard,
	type FixtureWord,
	useFakeResolution,
} from "@/fixtures";
import { type CardWordClick, ClickableWords } from "./clickable-words";
import { resolveNested } from "./entries";

/** One lookup: what was clicked, and a key that is new for each lookup. */
export type Lookup = {
	readonly key: string;
	readonly word: FixtureWord | string;
	readonly label: string;
};

/** Quicker than the fixtures' default, so three levels don't drag. */
const dealDelaysMs: readonly number[] = [80, 200, 340, 500];

/**
 * A lookup's Deck, as `CardStack` piles it, but the front Card's words are
 * buttons: its definition, its quote and its lemma link each start a
 * nested lookup. `instant` skips the deal, for a lookup revisited from
 * history.
 */
export function LookupDeck({
	lookup,
	instant = false,
	selectedId,
	onWord,
}: {
	readonly lookup: Lookup;
	readonly instant?: boolean;
	/** The word in this Deck that the next lookup came from. */
	readonly selectedId?: string | null;
	readonly onWord: (click: CardWordClick) => void;
}) {
	const resolution = useMemo(() => resolveNested(lookup.word), [lookup.key]);
	const dealt = useFakeResolution(lookup.word, dealDelaysMs);
	const count = instant ? resolution.cards.length : dealt.cards.length;
	const cards = resolution.cards.slice(0, count);
	const [front, setFront] = useState<number | null>(null);
	const frontIndex = Math.min(front ?? cards.length - 1, cards.length - 1);
	const shown = cards.slice(0, frontIndex + 1);

	return (
		<div className="flex flex-col">
			<AnimatePresence initial={false}>
				{shown.map((card, index) => {
					const depth = shown.length - 1 - index;
					return (
						<motion.div
							key={card.id}
							layout="position"
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0 }}
							transition={{
								type: "spring",
								duration: 0.3,
								bounce: 0,
							}}
							style={{
								marginInline: `${Math.min(depth, 4) * 0.5}rem`,
								zIndex: index,
							}}
							className={cn("relative", depth > 0 && "-mb-1.5")}
						>
							{depth > 0 ? (
								<CardView
									card={card}
									collapsed
									onTailClick={() => setFront(index)}
									className="pb-3"
								/>
							) : (
								<ClickableCard
									card={card}
									scope={lookup.key}
									selectedId={selectedId}
									onWord={onWord}
								/>
							)}
						</motion.div>
					);
				})}
			</AnimatePresence>
			{front === null && !instant
				? dealt.pending.map((kind) => (
						<CardSkeleton
							key={kind}
							kind={kind}
							collapsed
							className="mt-1"
						/>
					))
				: null}
		</div>
	);
}

/** `CardView`'s full Card, with every word of its texts clickable. */
function ClickableCard({
	card,
	scope,
	selectedId,
	onWord,
}: {
	readonly card: FakeCard;
	readonly scope: string;
	readonly selectedId?: string | null | undefined;
	readonly onWord: (click: CardWordClick) => void;
}) {
	const id = `${scope}~${card.id}`;
	return (
		<DensityScope
			density="compact"
			data-card-id={card.id}
			className="grid gap-3 rounded-xl border border-line bg-paper p-4 text-sm text-ink shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]"
		>
			<header className="grid gap-1">
				<span className="font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-faint uppercase">
					{card.kind}
				</span>
				<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<span aria-hidden="true" className="text-xl">
						{card.emoji}
					</span>
					<NoteTitle className="text-lg">{card.title}</NoteTitle>
					<Ipa transcription={card.ipa} />
				</div>
				<p className="text-ink-muted">{card.caption}</p>
			</header>
			<p className="text-ink-soft">{card.translations.join(", ")}</p>
			{card.definition ? (
				<p lang="de" dir="ltr" className="text-start">
					<ClickableWords
						id={`${id}~def`}
						text={card.definition}
						selectedId={selectedId}
						onWord={onWord}
					/>
				</p>
			) : null}
			{card.quote ? (
				<blockquote
					lang="de"
					dir="ltr"
					className="border-s-[3px] border-line ps-3 text-start text-ink-soft"
				>
					<ClickableWords
						id={`${id}~quote`}
						text={card.quote}
						marks={card.quoteMarks}
						selectedId={selectedId}
						onWord={onWord}
					/>
				</blockquote>
			) : null}
			{card.links.length > 0 ? (
				<nav className="flex flex-wrap gap-3 text-ink-muted">
					{card.links.map((link) => {
						const anchorId = `${id}~link~${link.word}`;
						return (
							<span key={anchorId}>
								{link.relation} →{" "}
								<NoteTitleLink
									data-word-id={anchorId}
									className={cn(
										"text-link",
										anchorId === selectedId && "underline",
									)}
									onClick={(event) => {
										event.stopPropagation();
										onWord({ word: link.word, anchorId });
									}}
								>
									{link.word}
								</NoteTitleLink>
							</span>
						);
					})}
				</nav>
			) : null}
		</DensityScope>
	);
}
