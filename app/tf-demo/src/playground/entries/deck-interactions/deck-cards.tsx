import { type MotionValue, motion } from "motion/react";
import {
	memo,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { CardFace, CardView } from "./card-view";
import type { Frame } from "./layout";
import type { MotionContext } from "./motion-kit";
import { type Readouts, useReadout } from "./readouts";
import type { CardValues, Deck, Mark } from "./use-deck";
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

/** The handlers every Card shares: the same functions on every render. */
type Handlers = {
	readonly down: CardHandler;
	readonly enter: CardHandler;
	readonly leave: CardHandler;
	readonly close: () => void;
};

/**
 * The Deck's Cards, back to front, each wired to the variant's gesture.
 * Escape or the Cover's × puts an expanded Card back. Each Card is
 * memoised and its handlers stay the same across renders, so a render of
 * the Deck re-renders only the Cards whose own props change: a reorder
 * moves their elements and re-renders none of them.
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
	/** Whether the Card under the pointer lights its border while the `DeckLayer` is lit; left out, none ever does. */
	readonly highlight?: boolean;
	readonly onDown: CardHandler;
	readonly onEnter?: CardHandler;
	readonly onLeave?: CardHandler;
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
	const latest = useRef({ onDown, onEnter, onLeave, closeCover, expanded });
	latest.current = { onDown, onEnter, onLeave, closeCover, expanded };
	const [handlers] = useState<Handlers>(() => ({
		down: (id, event) => {
			if (event.button !== 0 || latest.current.expanded) return;
			if ((event.target as HTMLElement).closest("button")) return;
			latest.current.onDown(id, event);
		},
		enter: (id, event) => latest.current.onEnter?.(id, event),
		leave: (id, event) => latest.current.onLeave?.(id, event),
		close: () => latest.current.closeCover(),
	}));
	if (deck.status === "gone") return null;
	return deck.order.map((id) => (
		<DeckCard
			key={id}
			id={id}
			values={deck.valuesOf(id)}
			rtl={rtl}
			held={held === id}
			expanded={expanded === id}
			mark={deck.marks[id] ?? null}
			highlight={highlight}
			hovers={onEnter !== undefined || onLeave !== undefined}
			handlers={handlers}
		/>
	));
}

const DeckCard = memo(function DeckCard({
	id,
	values,
	rtl,
	held,
	expanded,
	mark,
	highlight,
	hovers,
	handlers,
}: {
	readonly id: string;
	readonly values: CardValues;
	readonly rtl: boolean;
	readonly held: boolean;
	readonly expanded: boolean;
	readonly mark: Mark | null;
	readonly highlight: boolean | undefined;
	readonly hovers: boolean;
	readonly handlers: Handlers;
}) {
	const card = cardById(id);
	if (!card) return null;
	return (
		<CardView
			id={id}
			label={`${card.title} card`}
			values={values}
			rtl={rtl}
			held={held}
			expanded={expanded}
			mark={mark}
			highlight={highlight}
			onPointerDown={(event) => handlers.down(id, event)}
			onPointerEnter={
				hovers ? (event) => handlers.enter(id, event) : undefined
			}
			onPointerLeave={
				hovers ? (event) => handlers.leave(id, event) : undefined
			}
		>
			<CardFace
				card={card}
				expanded={expanded}
				onClose={handlers.close}
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
