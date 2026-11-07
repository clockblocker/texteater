import { type MotionValue, motionValue } from "motion/react";
import {
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import type { Slot } from "../deck-interactions/geometry";
import type { Frame } from "../deck-interactions/layout";
import type { MotionContext } from "../deck-interactions/motion-kit";
import { createReadouts } from "../deck-interactions/readouts";
import { useDeck } from "../deck-interactions/use-deck";
import { sideAt, type TurnFeel, turnTarget, turnTo } from "./card-turn";
import { getFontSize } from "./font-size";
import { playTrick } from "./play-trick";
import { PLAYING_DECK, type PlayingCard, type Side } from "./playing-cards";
import * as tricks from "./tricks";

/**
 * The model's frame is fixed: every trick places Cards around the felt's
 * centre, so a resize moves nothing, as in deck-of-cards.
 */
const TABLE: Frame = { w: 1, h: 1 };
/** A press shorter than this turns the Card over. */
const TAP_MS = 200;
/** The first z-index a picked-up Card takes; each pick-up takes the next. */
const FIRST_TOP_Z = 52;
/** A fresh Deck's angle: face down (`card-turn`). */
const FACE_DOWN = 180;

/** The box of a 62 × 88 Card, in px of the root's rem as the library sizes it. */
export function cardSize(): { readonly w: number; readonly h: number } {
	const rem =
		Number.parseFloat(
			getComputedStyle(document.documentElement).fontSize,
		) || 16;
	return { w: (62 * rem) / 16, h: (88 * rem) / 16 };
}

/** Where the stack rests: Card `i` a quarter px up and to the left of the last. */
function stackLayout(size: { readonly w: number; readonly h: number }) {
	return (_frame: Frame, count: number): Slot[] =>
		Array.from({ length: count }, (_, i) => ({
			u: tricks.stackOffset(i),
			v: tricks.stackOffset(i),
			w: size.w,
			h: size.h,
			r: 0,
			s: 1,
		}));
}

/** The tricks waiting their turn; a Deck that unmounts stops its own. */
type Queue = {
	tail: Promise<unknown>;
	readonly stops: Set<() => void>;
	live: boolean;
};

function newQueue(): Queue {
	return { tail: Promise.resolve(), stops: new Set(), live: true };
}

/**
 * deck-of-cards' Deck on tf-demo's model: `useDeck` holds every Card's
 * values, `playTrick` moves them on the deck-of-cards profile, and the
 * tricks run one after another, as the library's queue runs them. The
 * Deck's order and each Card's turn live here: the model has neither.
 */
export function useTrickDeck(motion: MotionContext, feel: TurnFeel) {
	const [readouts] = useState(createReadouts);
	const [layout] = useState(() => stackLayout(cardSize()));
	const deck = useDeck({
		cards: PLAYING_DECK,
		frame: TABLE,
		motion,
		readouts,
		layout,
		deal: 0,
	});
	const { valuesOf } = deck;
	const motionRef = deck.motion;
	/* each Card's angle, and the angle it rests on or is turning to */
	const [turns] = useState(
		() =>
			new Map(
				PLAYING_DECK.map((card) => [card.id, motionValue(FACE_DOWN)]),
			),
	);
	const [targets] = useState(
		() => new Map(PLAYING_DECK.map((card) => [card.id, FACE_DOWN])),
	);
	const feelRef = useRef(feel);
	feelRef.current = feel;
	const turnOf = useCallback(
		(id: string): MotionValue<number> =>
			turns.get(id) ?? motionValue(FACE_DOWN),
		[turns],
	);
	/**
	 * The side a Card rests on, or is turning to: what a trick or a tap
	 * decides from, so a Card turned again mid-turn turns back, as the
	 * library's instant switch would have.
	 */
	const restingSide = useCallback(
		(id: string): Side => sideAt(targets.get(id) ?? FACE_DOWN),
		[targets],
	);
	const turn = useCallback(
		(id: string, side: Side) => {
			const value = turnOf(id);
			const target = targets.get(id) ?? value.get();
			const next = turnTarget(value.get(), target, side);
			if (next === target) return undefined;
			targets.set(id, next);
			return turnTo(value, next, feelRef.current, motionRef.current);
		},
		[turnOf, targets, motionRef],
	);
	const order = useRef<readonly PlayingCard[]>(PLAYING_DECK);
	const queue = useRef(newQueue());
	const topZ = useRef(FIRST_TOP_Z);

	/** Queues a trick, made from the order it finds when its turn comes. */
	const run = useCallback(
		(make: (current: readonly PlayingCard[]) => tricks.Trick) => {
			const stage = queue.current;
			stage.tail = stage.tail.then(() => {
				if (!stage.live) return;
				const trick = make(order.current);
				order.current = trick.order;
				const played = playTrick(
					trick,
					{ valuesOf, turn },
					motionRef.current,
				);
				stage.stops.add(played.stop);
				return played.done;
			});
		},
		[valuesOf, turn, motionRef],
	);

	/* a fresh Deck on every mount, face down in mount order, then the
	   library's opening: the intro and a sort */
	useEffect(() => {
		const stage = newQueue();
		queue.current = stage;
		order.current = PLAYING_DECK;
		for (const card of PLAYING_DECK) {
			valuesOf(card.id).z.jump(0);
			turnOf(card.id).jump(FACE_DOWN);
			targets.set(card.id, FACE_DOWN);
		}
		run(tricks.intro);
		run((current) => tricks.sort(current));
		return () => {
			stage.live = false;
			for (const stop of stage.stops) stop();
		};
	}, [run, valuesOf, turnOf, targets]);

	const actions = {
		intro: () => run(tricks.intro),
		flip: () => run((current) => tricks.flip(current, restingSide)),
		shuffle: () => run((current) => tricks.shuffle(current, getFontSize())),
		sort: (reverse?: boolean) =>
			run((current) => tricks.sort(current, reverse)),
		bysuit: () => run((current) => tricks.bysuit(current, getFontSize())),
		fan: () => run((current) => tricks.fan(current, getFontSize())),
		poker: () => run((current) => tricks.poker(current, getFontSize())),
		turnDown: () => run(tricks.turnDown),
	};

	/**
	 * The library's drag: the Card follows the pointer 1:1, rounded to the
	 * px, over every other Card, and a press shorter than 200 ms turns it.
	 */
	const drag = useCallback(
		(id: string, event: ReactPointerEvent<HTMLElement>) => {
			if (event.button !== 0) return;
			event.preventDefault();
			const card = valuesOf(id);
			const start = { x: event.clientX, y: event.clientY };
			const from = { u: card.u.get(), v: card.v.get() };
			const pressed = performance.now();
			card.z.set(topZ.current);
			topZ.current += 1;
			const onMove = (move: PointerEvent) => {
				card.u.set(Math.round(from.u + move.clientX - start.x));
				card.v.set(Math.round(from.v + move.clientY - start.y));
			};
			const onUp = (up: PointerEvent) => {
				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onUp);
				window.removeEventListener("pointercancel", onUp);
				if (performance.now() - pressed < TAP_MS)
					turn(id, restingSide(id) === "front" ? "back" : "front");
				const moved = {
					u: up.clientX - start.x,
					v: up.clientY - start.y,
				};
				if (moved.u === 0 && moved.v === 0) return;
				card.u.set(from.u + moved.u);
				card.v.set(from.v + moved.v);
			};
			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", onUp);
			window.addEventListener("pointercancel", onUp);
		},
		[valuesOf, turn, restingSide],
	);

	return { valuesOf, turnOf, actions, drag };
}
