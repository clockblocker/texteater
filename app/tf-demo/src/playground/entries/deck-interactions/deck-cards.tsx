import { type MotionValue, motion } from "motion/react";
import {
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useEffect,
} from "react";
import { CardFace, CardView } from "./card-view";
import type { Frame } from "./layout";
import type { MotionContext } from "./motion-kit";
import { type Readouts, useReadout } from "./readouts";
import type { Deck } from "./use-deck";
import { cardById } from "./words";

/** What every variant is rendered with. */
export type VariantProps<K> = {
	readonly frame: Frame;
	readonly rtl: boolean;
	readonly motion: MotionContext;
	readonly readouts: Readouts;
	readonly knobs: K;
	/** Bumped by the inspector's Re-deal. */
	readonly deal: number;
};

type CardHandler = (id: string, event: ReactPointerEvent<HTMLElement>) => void;

/**
 * The Deck's Cards, back to front, each wired to the variant's gesture.
 * Escape or the Cover's × puts an expanded Card back.
 */
export function DeckCards({
	deck,
	rtl,
	held,
	highlight,
	onDown,
	onEnter,
	onLeave,
}: {
	readonly deck: Deck;
	readonly rtl: boolean;
	readonly held: string | null;
	/** Whether the Card under the pointer lights its border now; left out, none ever does. */
	readonly highlight?: boolean;
	readonly onDown: CardHandler;
	readonly onEnter?: CardHandler;
	readonly onLeave?: CardHandler;
}) {
	const { expanded, closeCover } = deck;
	useEffect(() => {
		if (!expanded) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") void closeCover();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [expanded, closeCover]);
	if (deck.status === "gone") return null;
	return deck.order.map((id) => {
		const card = cardById(id);
		if (!card) return null;
		return (
			<CardView
				key={id}
				id={id}
				label={`${card.title} card`}
				values={deck.valuesOf(id)}
				rtl={rtl}
				held={held === id}
				expanded={expanded === id}
				mark={deck.marks[id] ?? null}
				highlight={highlight}
				onPointerDown={(event) => {
					if (event.button !== 0 || expanded) return;
					if ((event.target as HTMLElement).closest("button")) return;
					onDown(id, event);
				}}
				onPointerEnter={onEnter && ((event) => onEnter(id, event))}
				onPointerLeave={onLeave && ((event) => onLeave(id, event))}
			>
				<CardFace
					card={card}
					expanded={expanded === id}
					onClose={() => void closeCover()}
				/>
			</CardView>
		);
	});
}

/**
 * The Deck as one flattened layer over the whole frame: its opacity fades
 * every Card in it as one picture, so no Card ever shows through another.
 * It is its own stacking context at any opacity, so what is in it stacks
 * the same whether it is faded or not.
 */
export function DeckLayer({
	opacity,
	children,
}: {
	readonly opacity: MotionValue<number>;
	readonly children: ReactNode;
}) {
	return (
		<motion.div
			data-deck-layer=""
			className="absolute inset-0 isolate"
			style={{ opacity }}
		>
			{children}
		</motion.div>
	);
}

/** The projected endpoint of the Card's centre: an evaluator's mark, off by default. */
export function ProjectionDot({ readouts }: { readonly readouts: Readouts }) {
	const { projected } = useReadout(readouts);
	if (!projected) return null;
	return (
		<div
			aria-hidden="true"
			data-projection=""
			className="pointer-events-none absolute z-[300] size-3 -translate-y-1/2 rounded-full border-2 border-paper bg-link ltr:-translate-x-1/2 rtl:translate-x-1/2"
			style={{ insetInlineStart: projected.u, top: projected.v }}
		/>
	);
}
