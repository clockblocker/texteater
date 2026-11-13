import { type MotionValue, motion } from "motion/react";
import {
	memo,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useDeferredValue,
	useEffect,
	useRef,
	useState,
} from "react";
import { PresentationContent } from "@/presentation/presentation-content";
import { CardView } from "./card-view";
import type { DealtCard } from "./dealt-cards";
import type { Frame } from "./layout";
import type { MotionContext } from "./motion-kit";
import type { Readouts } from "./readouts";
import type { CardValues, Deck } from "./use-deck";

/** What every variant is rendered with. */
export type VariantProps<K> = {
	/** The Cards dealt, back to front. */
	readonly cards: readonly DealtCard[];
	readonly frame: Frame;
	readonly rtl: boolean;
	readonly motion: MotionContext;
	readonly readouts: Readouts;
	readonly knobs: K;
	/** Bumped by the inspector's Re-deal. */
	readonly deal: number;
};

type CardHandler = (id: string, event: ReactPointerEvent<HTMLElement>) => void;

/** The handlers every Card shares: the same functions on every render. */
type Handlers = {
	readonly down: CardHandler;
	readonly close: () => void;
};

/**
 * The Deck's Cards, back to front, each wired to the variant's gesture.
 * Escape or the Cover's ← or × puts an expanded Card back. Each Card is
 * memoised and its handlers stay the same across renders, so a render of
 * the Deck re-renders only the Cards whose own props change: a reorder
 * moves their elements and re-renders none of them. That is why every
 * Card on the Deck is drawn in the open Card's form, whichever is in
 * front: a Card Tail's form differs only in a Body that does not scroll,
 * under the Card in front of it.
 */
export function DeckCards({
	cards,
	deck,
	rtl,
	held,
	highlight,
	onDown,
}: {
	/** The Cards the Deck was dealt, by which each id is drawn. */
	readonly cards: readonly DealtCard[];
	readonly deck: Deck;
	readonly rtl: boolean;
	readonly held: string | null;
	/** Whether the Card under the pointer lights its border while the `DeckLayer` is lit; left out, none ever does. */
	readonly highlight?: boolean;
	readonly onDown: CardHandler;
}) {
	const { expanded, closeCover } = deck;
	useEffect(() => {
		if (!expanded) return;
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") closeCover();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [expanded, closeCover]);
	const latest = useRef({ onDown, closeCover, expanded });
	latest.current = { onDown, closeCover, expanded };
	const [handlers] = useState<Handlers>(() => ({
		down: (id, event) => {
			if (event.button !== 0 || latest.current.expanded) return;
			if ((event.target as HTMLElement).closest("button")) return;
			latest.current.onDown(id, event);
		},
		close: () => latest.current.closeCover(),
	}));
	if (deck.status === "gone") return null;
	return deck.order
		.flatMap((id) => {
			const card = cards.find((dealt) => dealt.id === id);
			return card ? [card] : [];
		})
		.map((card) => (
			<DeckCard
				key={card.id}
				card={card}
				values={deck.valuesOf(card.id)}
				rtl={rtl}
				held={held === card.id}
				expanded={expanded === card.id}
				highlight={highlight}
				handlers={handlers}
			/>
		));
}

const DeckCard = memo(function DeckCard({
	card,
	values,
	rtl,
	held,
	expanded,
	highlight,
	handlers,
}: {
	readonly card: DealtCard;
	readonly values: CardValues;
	readonly rtl: boolean;
	readonly held: boolean;
	readonly expanded: boolean;
	readonly highlight: boolean | undefined;
	readonly handlers: Handlers;
}) {
	const { id, parts } = card;
	const form = expanded ? "cover" : "card";
	/* the box takes its new form at once, with the move; what it holds is
	   a whole Note, drawn again for the form, and follows as soon as React
	   has it, so drawing it never holds a frame of the move */
	const drawn = useDeferredValue(form);
	const sheet = drawn === "cover";
	return (
		<CardView
			id={id}
			label={`${parts.label} ${form}`}
			form={form}
			values={values}
			rtl={rtl}
			held={held}
			highlight={highlight}
			onPointerDown={(event) => handlers.down(id, event)}
		>
			<PresentationContent
				form={drawn}
				columnRem={parts.columnRem}
				heading={parts.heading}
				body={sheet ? parts.body.sheet : parts.body.card}
				chrome={{
					back: {
						label: "Collapse back to card",
						enabled: true,
						onPress: handlers.close,
					},
					clear: {
						label: "Close",
						enabled: true,
						onPress: handlers.close,
					},
				}}
			/>
		</CardView>
	);
});

/**
 * The Deck as one flattened layer over the whole frame: its opacity fades
 * every Card in it as one picture, so no Card ever shows through another.
 * It is its own stacking context at any opacity, so what is in it stacks
 * the same whether it is faded or not.
 */
export function DeckLayer({
	opacity,
	lit,
	children,
}: {
	readonly opacity: MotionValue<number>;
	/** Whether the Card under the pointer lights its border now. */
	readonly lit?: boolean;
	readonly children: ReactNode;
}) {
	return (
		<motion.div
			data-deck-layer=""
			data-lit={lit || undefined}
			className="group/deck absolute inset-0 isolate"
			style={{ opacity }}
		>
			{children}
		</motion.div>
	);
}
