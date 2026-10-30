import { cn } from "lego";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { CardKind } from "./cases";

/** One Card dealt into the popover's Deck. */
export type Dealt = { readonly key: string; readonly kind: CardKind };

/**
 * The fixtures' `CardStack`, copied for this demo's own Cards, as tf-demo's
 * Deck piles them: the front Card in full, the Cards before it as tails
 * above, each a little narrower the further back it sits. A Card's link
 * deals the next Card to the front; a tail goes back to its Card.
 */
export function Deck({
	cards,
	renderFront,
	renderTail,
}: {
	/** The Cards dealt, the front one last. */
	readonly cards: readonly Dealt[];
	readonly renderFront: (card: Dealt) => ReactNode;
	readonly renderTail: (card: Dealt, index: number) => ReactNode;
}) {
	return (
		<div className="flex flex-col">
			<AnimatePresence initial={false}>
				{cards.map((card, index) => {
					const depth = cards.length - 1 - index;
					return (
						<motion.div
							key={card.key}
							layout="position"
							initial={{ opacity: 0, y: 12 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 12 }}
							transition={{
								type: "spring",
								duration: 0.32,
								bounce: 0,
							}}
							style={{
								marginInline: `${Math.min(depth, 4) * 0.5}rem`,
								zIndex: index,
							}}
							className={cn("relative", depth > 0 && "-mb-1.5")}
						>
							{depth > 0
								? renderTail(card, index)
								: renderFront(card)}
						</motion.div>
					);
				})}
			</AnimatePresence>
		</div>
	);
}
