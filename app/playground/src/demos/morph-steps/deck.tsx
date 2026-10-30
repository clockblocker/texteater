import { cn } from "lego";
import { motion } from "motion/react";
import type { ReactNode } from "react";

/** The Cards a click leads through, in the order the links push them. */
export type CardKind = "attestation" | "surface" | "lemma";

const spring = { type: "spring", duration: 0.32, bounce: 0 } as const;

/** Where a Card's tail sits: inset by how far it is from the front. */
function inset(distance: number) {
	return { marginInline: `${Math.min(distance, 4) * 0.5}rem` };
}

/**
 * lemma-hop's tail Deck, copied because demos don't import each other: a
 * Card's route pushes the next Card under it and brings it to the front.
 * Every Card stays where it was pushed, those before the front one as
 * tails above it and those after as tails tucked under it; a tail brings
 * its Card back to the front.
 */
export function Deck({
	cards,
	front,
	renderFront,
	renderTail,
	reducedMotion,
}: {
	/** The Cards pushed so far, in push order. */
	readonly cards: readonly CardKind[];
	readonly front: CardKind;
	readonly renderFront: (kind: CardKind) => ReactNode;
	readonly renderTail: (kind: CardKind, before: boolean) => ReactNode;
	readonly reducedMotion: boolean;
}) {
	const at = cards.indexOf(front);
	return (
		<div className="flex flex-col">
			{cards.map((kind, index) => {
				const distance = Math.abs(at - index);
				const before = index < at;
				return (
					<motion.div
						key={kind}
						layout="position"
						initial={reducedMotion ? false : { opacity: 0, y: 10 }}
						animate={{ opacity: 1, y: 0 }}
						transition={reducedMotion ? { duration: 0 } : spring}
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
						{index === at
							? renderFront(kind)
							: renderTail(kind, before)}
					</motion.div>
				);
			})}
		</div>
	);
}
