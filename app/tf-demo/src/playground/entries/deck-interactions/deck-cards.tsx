import type { Place } from "compass";
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
import { cardForm } from "@/presentation/form";
import { PresentationContent } from "@/presentation/presentation-content";
import { CardView } from "./card-view";
import type { DealtCard } from "./dealt-cards";
import type { Frame } from "./layout";
import type { MotionContext } from "./motion-kit";
import type { Readouts } from "./readouts";
import { placeOf } from "./stacking";
import type { CardValues, Deck } from "./use-deck";
import type { Width } from "./width";

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
	/** How wide the screen reads: the inspector's override, or the screen's own. */
	readonly width: Width;
};

type CardHandler = (id: string, event: ReactPointerEvent<HTMLElement>) => void;

/** The handlers every Card shares: the same functions on every render. */
type Handlers = {
	readonly down: CardHandler;
	readonly close: (id: string) => void;
};

/**
 * The Deck's Cards, back to front, each wired to the variant's gesture.
 * A Card's ← or × puts it back from its Cover, and Escape the one over
 * the Deck, or else the one in the other Pane. A Card in the other Pane
 * takes no press, and leaves the rest free to take theirs. Each Card is
 * memoised and its handlers stay the same across renders, so a render of
 * the Deck re-renders only the Cards whose own props change. As in
 * tf-demo, a Card's place in the Deck says its form: the open Card's, a
 * Card Tail folded above it, or one folded below it with its Heading at
 * its lower edge, so the strip that shows under the Card before it is its
 * title. A tap re-renders only the Cards whose place it changes.
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
	const { expanded, beside, closeCover } = deck;
	useEffect(() => {
		if (!expanded && !beside) return;
		/* on the document, so it runs before the Inspector's window
		   listener, which leaves an Escape that closed a Cover alone */
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape") return;
			event.preventDefault();
			closeCover();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [expanded, beside, closeCover]);
	const latest = useRef({ onDown, closeCover, expanded, beside });
	latest.current = { onDown, closeCover, expanded, beside };
	const [handlers] = useState<Handlers>(() => ({
		down: (id, event) => {
			if (event.button !== 0 || latest.current.expanded) return;
			if (id === latest.current.beside) return;
			if ((event.target as HTMLElement).closest("button")) return;
			latest.current.onDown(id, event);
		},
		close: (id) => latest.current.closeCover(id),
	}));
	if (deck.status === "gone") return null;
	return deck.order
		.flatMap((id, index) => {
			const card = cards.find((dealt) => dealt.id === id);
			return card ? [{ card, place: placeOf(index, deck.openAt) }] : [];
		})
		.map(({ card, place }) => (
			<DeckCard
				key={card.id}
				card={card}
				place={place}
				values={deck.valuesOf(card.id)}
				rtl={rtl}
				held={held === card.id}
				expanded={expanded === card.id || beside === card.id}
				aside={beside === card.id}
				highlight={highlight}
				handlers={handlers}
			/>
		));
}

const DeckCard = memo(function DeckCard({
	card,
	place,
	values,
	rtl,
	held,
	expanded,
	aside,
	highlight,
	handlers,
}: {
	readonly card: DealtCard;
	/** Where it rests in the Deck, against the open Card. */
	readonly place: Place;
	readonly values: CardValues;
	readonly rtl: boolean;
	readonly held: boolean;
	readonly expanded: boolean;
	readonly aside: boolean;
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
	/* a change of place is no move: its Tail's form is drawn with it, at once */
	const content = sheet ? "cover" : cardForm(place);
	return (
		<CardView
			id={id}
			label={`${parts.label} ${form}`}
			form={form}
			values={values}
			rtl={rtl}
			held={held}
			aside={aside}
			place={place}
			highlight={highlight}
			onPointerDown={(event) => handlers.down(id, event)}
		>
			<PresentationContent
				form={content}
				columnRem={parts.columnRem}
				heading={parts.heading}
				body={sheet ? parts.body.sheet : parts.body.card}
				chrome={{
					back: {
						label: "Collapse back to card",
						enabled: true,
						onPress: () => handlers.close(id),
					},
					clear: {
						label: "Close",
						enabled: true,
						onPress: () => handlers.close(id),
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
