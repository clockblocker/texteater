import { cn } from "lego";
import { ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import {
	type CardKind,
	CardSkeleton,
	CardView,
	cardLang,
	type FakeCard,
	langAttrs,
} from "@/fixtures";

/**
 * The Deck's contents, three ways. None of them changes the Deck in place:
 * Cards are only added, in deal order, and a Card brought to the front
 * stays where it was dealt.
 */

type DeckProps = {
	/** The Cards dealt so far, in deal order. */
	readonly cards: readonly FakeCard[];
	/** The kinds still on their way. */
	readonly pending: readonly CardKind[];
	/** The Card in front. */
	readonly front: CardKind;
	/** Draws the front Card in full, with what the variant adds. */
	readonly renderFront: (card: FakeCard) => ReactNode;
};

const spring = { type: "spring", duration: 0.32, bounce: 0 } as const;

/** Where a Card's tail sits: inset by how far it is from the front. */
function inset(distance: number) {
	return { marginInline: `${Math.min(distance, 4) * 0.5}rem` };
}

/**
 * tf-demo's Deck as the click deals it, with the front Card in full and
 * the Cards dealt before it as tails above. The tails are only its story
 * here, not buttons.
 */
export function StoryDeck({ cards, pending, front, renderFront }: DeckProps) {
	const at = cards.findIndex((card) => card.kind === front);
	return (
		<div className="flex flex-col">
			{cards.slice(0, at + 1).map((card, index) => {
				const distance = at - index;
				return (
					<motion.div
						key={card.id}
						layout="position"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={spring}
						style={{ ...inset(distance), zIndex: index }}
						className={cn("relative", distance > 0 && "-mb-1.5")}
					>
						{distance > 0 ? (
							<CardView card={card} collapsed className="pb-3" />
						) : (
							renderFront(card)
						)}
					</motion.div>
				);
			})}
			{pending.map((kind) => (
				<CardSkeleton
					key={kind}
					kind={kind}
					collapsed
					className="mt-1"
				/>
			))}
		</div>
	);
}

/**
 * Every Card stays where it was dealt: the Cards dealt before the front
 * one as tails above it, those dealt after as tails tucked under it. A
 * tail brings its Card to the front; nothing moves out of order, so the
 * Reading's tail is always there to go back to.
 */
function TailDeck({
	cards,
	pending,
	front,
	renderFront,
	onFront,
}: DeckProps & { readonly onFront: (kind: CardKind) => void }) {
	const at = cards.findIndex((card) => card.kind === front);
	return (
		<div className="flex flex-col">
			{cards.map((card, index) => {
				const distance = Math.abs(at - index);
				const before = index < at;
				return (
					<motion.div
						key={card.id}
						layout="position"
						initial={{ opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={spring}
						data-front={index === at ? "" : undefined}
						style={{
							...inset(distance),
							zIndex: before ? index : cards.length - distance,
						}}
						className={cn(
							"relative",
							before && "-mb-1.5",
							index > at && "-mt-1.5",
						)}
					>
						{index === at ? (
							renderFront(card)
						) : (
							<CardView
								card={card}
								collapsed
								onTailClick={() => onFront(card.kind)}
								className={before ? "pb-3" : "pt-3"}
							/>
						)}
					</motion.div>
				);
			})}
			{pending.map((kind) => (
				<CardSkeleton
					key={kind}
					kind={kind}
					collapsed
					className="mt-1"
				/>
			))}
		</div>
	);
}

/** The kinds the breadcrumb names: the form, its lemma, the sense. */
const crumbKinds: readonly CardKind[] = ["Surface", "Lemma", "Reading"];

/**
 * A breadcrumb over the front Card, `ging › gehen › 🚶 gehen`, one crumb
 * per Card dealt; a crumb brings its Card to the front. The same Deck as
 * the tails', with the crumbs as the way between Cards.
 */
function CrumbDeck({
	cards,
	pending,
	front,
	renderFront,
	onFront,
}: DeckProps & { readonly onFront: (kind: CardKind) => void }) {
	const crumbs = cards.filter((card) => crumbKinds.includes(card.kind));
	const waiting = pending.filter((kind) => crumbKinds.includes(kind));
	const frontCard = cards.find((card) => card.kind === front);
	return (
		<div className="flex flex-col">
			{crumbs.length > 0 ? (
				<nav
					aria-label="Cards in this Deck"
					className="relative z-0 -mb-2 rounded-xl border border-line bg-paper px-1.5 pt-1 pb-3 shadow-[0_8px_24px_-12px_oklch(0%_0_0/0.5)]"
				>
					<ol className="flex flex-wrap items-center gap-x-0.5 gap-y-1 text-sm">
						{crumbs.map((card, index) => (
							<li
								key={card.id}
								className="flex items-center gap-0.5"
							>
								{index > 0 ? (
									<ChevronRight
										aria-hidden="true"
										className="size-3.5 shrink-0 text-ink-faint rtl:-scale-x-100"
									/>
								) : null}
								<button
									type="button"
									aria-current={
										card.kind === front ? "step" : undefined
									}
									onClick={() => onFront(card.kind)}
									className={cn(
										"cursor-pointer rounded-md px-1.5 py-0.5 transition-colors",
										card.kind === front
											? "bg-canvas font-medium text-ink ring-1 ring-line"
											: "text-link hover:bg-canvas",
									)}
								>
									{card.kind === "Reading" ? (
										<span aria-hidden="true">
											{card.emoji}{" "}
										</span>
									) : null}
									<span {...langAttrs(cardLang(card))}>
										{card.title}
									</span>
								</button>
							</li>
						))}
						{waiting.map((kind) => (
							<li
								key={kind}
								role="status"
								aria-label={`Loading ${kind}`}
								className="flex items-center gap-0.5"
							>
								<ChevronRight
									aria-hidden="true"
									className="size-3.5 shrink-0 text-ink-faint rtl:-scale-x-100"
								/>
								<span className="h-4 w-12 animate-pulse rounded bg-line" />
							</li>
						))}
					</ol>
				</nav>
			) : null}
			{frontCard ? (
				<motion.div
					key={frontCard.id}
					data-front=""
					className="relative z-10"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ duration: 0.16 }}
				>
					{renderFront(frontCard)}
				</motion.div>
			) : null}
			{crumbs.length === 0
				? pending.map((kind) => (
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

/** The Deck of all four Cards, stepped through by tails or by crumbs. */
export function SteppedDeck({
	shape,
	...props
}: DeckProps & {
	readonly shape: "tails" | "crumbs";
	readonly onFront: (kind: CardKind) => void;
}) {
	return shape === "tails" ? (
		<TailDeck {...props} />
	) : (
		<CrumbDeck {...props} />
	);
}
