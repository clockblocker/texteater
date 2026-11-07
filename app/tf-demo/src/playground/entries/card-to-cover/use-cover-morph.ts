import {
	animate,
	frame as motionFrame,
	motionValue,
	type Transition,
} from "motion/react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Rect } from "../deck-interactions/geometry";
import { coverRect, type Frame } from "../deck-interactions/layout";
import {
	cue,
	type MotionContext,
	transition,
	tweenTo,
} from "../deck-interactions/motion-kit";
import type { CardValues, Deck } from "../deck-interactions/use-deck";
import { coverCardById, MAX_COVER_ONLY } from "./cover-deck";
import type { Reveal } from "./cover-face";
import type { Recorder } from "./recorder";
import {
	LEAVE_MS,
	landingMs,
	type MorphFeel,
	type MoveFeel,
	moveSpec,
	openTimeline,
	REDUCED_FADE_MS,
	REVEAL_MS,
	RISE_PX,
	settledMs,
} from "./timing";

/** What the box's own glide moves: its place and its real size. */
const BOX = ["u", "v", "w", "h"] as const;
const COVER_Z = 200;
/** A change of form nobody sees move: the reduced swap, behind a fade. */
const INSTANT: Transition = { duration: 0 };

function makeReveal(count: number): Reveal {
	return {
		opacity: Array.from({ length: count }, () => motionValue(0)),
		y: Array.from({ length: count }, () => motionValue(RISE_PX)),
	};
}

function hide(reveal: Reveal) {
	for (const value of reveal.opacity) value.jump(0);
	for (const value of reveal.y) value.jump(RISE_PX);
}

/**
 * Glides the box's own `u v w h` to `to` on `move`, all from one start and
 * from rest, so the box resizes as it travels and never scales. A value
 * still moving stops where it shows first.
 */
function glideBox(
	card: CardValues,
	to: Rect,
	move: MoveFeel,
	context: MotionContext,
): Promise<void> {
	const spec = transition(moveSpec(move), context);
	for (const key of BOX) card[key].jump(card[key].get());
	return Promise.all(
		BOX.map((key) => animate(card[key], to[key], spec).finished),
	).then(() => undefined);
}

/**
 * One Card at a time grows into its Cover and back: the same element,
 * whose box glides on its own values while its face's parts move to their
 * new places, and whose Cover-only parts fade and rise in after the move,
 * started by motion-kit's `cue`. Reduced, the element fades out at the
 * Card's box and in at the Cover's, `REDUCED_FADE_MS` each way. Every open
 * and close is recorded for the inspector.
 */
export function useCoverMorph({
	deck,
	frame,
	motion,
	feel,
	rtl,
	frameRef,
	recorder,
}: {
	readonly deck: Deck;
	readonly frame: Frame;
	readonly motion: MotionContext;
	readonly feel: MorphFeel;
	readonly rtl: boolean;
	readonly frameRef: RefObject<HTMLDivElement | null>;
	readonly recorder: Recorder;
}) {
	/** The Card whose face is the Cover's. */
	const [openId, setOpenId] = useState<string | null>(null);
	/** What the parts ride on the latest change of form. */
	const [parts, setParts] = useState<Transition>(INSTANT);
	/** How the Card's clip fade comes back after the latest close. */
	const [cardFade, setCardFade] = useState<Transition>(INSTANT);
	const [reveal] = useState(() => makeReveal(MAX_COVER_ONLY));
	const openRef = useRef<string | null>(null);
	/** Bumped by every open and close, so a stale continuation stops. */
	const run = useRef(0);
	const cues = useRef<(() => void)[]>([]);
	/** Where the open Card stacked before it rose into the Cover. */
	const restZ = useRef(0);
	const live = useRef({ motion, feel, frame });
	live.current = { motion, feel, frame };

	const stopCues = () => {
		for (const cancel of cues.current) cancel();
		cues.current = [];
	};
	const flip = (id: string | null, next: Transition, fade = INSTANT) => {
		openRef.current = id;
		flushSync(() => {
			setParts(next);
			setCardFade(fade);
			setOpenId(id);
		});
	};
	const record = (kind: "open" | "close", id: string, minMs: number) => {
		const element = frameRef.current;
		if (element)
			recorder.start({
				kind,
				id,
				rtl,
				frame: element,
				minMs: minMs / live.current.motion.timeScale,
			});
	};

	/**
	 * The reduced change of form: the element fades out where it is, takes
	 * its new form and box unseen, and fades in at `to`. Motion draws every
	 * layout change, an instant one too, at its start for one frame before
	 * it moves it, so the box swaps and the fade-in starts only once
	 * Motion's next frame has put the parts in their new places.
	 */
	const swapUnseen = (
		card: CardValues,
		id: string | null,
		to: Rect,
		token: number,
		show: () => void,
		then?: () => void,
	) => {
		const context = live.current.motion;
		void tweenTo(card.o, 0, REDUCED_FADE_MS, context).finished.then(() => {
			if (run.current !== token) return;
			flip(id, INSTANT);
			motionFrame.postRender(() => {
				if (run.current !== token) return;
				for (const key of BOX) card[key].jump(to[key]);
				show();
				void tweenTo(card.o, 1, REDUCED_FADE_MS, context).finished.then(
					() => then?.(),
				);
			});
		});
	};

	const open = (id: string) => {
		if (openRef.current !== null) return;
		const { motion: context, feel: current, frame: size } = live.current;
		const token = ++run.current;
		stopCues();
		const card = deck.valuesOf(id);
		const to = coverRect(size);
		if (!deck.isBusy(id)) restZ.current = card.z.get();
		deck.hold(id);
		card.z.set(COVER_Z);
		hide(reveal);
		if (context.reduce) {
			record("open", id, 2 * REDUCED_FADE_MS);
			swapUnseen(card, id, to, token, () => {
				for (const value of reveal.opacity) value.jump(1);
				for (const value of reveal.y) value.jump(0);
			});
			return;
		}
		const count = 1 + (coverCardById(id)?.coverContexts.length ?? 0);
		const timeline = openTimeline(current, count);
		flip(
			id,
			transition(
				{ ...moveSpec(current.move), delayMs: timeline.partsAt },
				context,
			),
		);
		void glideBox(card, to, current.move, context);
		cues.current = timeline.revealAt.map((at, index) =>
			cue(
				at,
				() => {
					const spec = transition({ ms: REVEAL_MS }, context);
					const opacity = reveal.opacity[index];
					const y = reveal.y[index];
					if (opacity) animate(opacity, 1, spec);
					if (y) animate(y, 0, spec);
				},
				context,
			),
		);
		record(
			"open",
			id,
			Math.max(
				(timeline.revealAt.at(-1) ?? 0) + REVEAL_MS,
				timeline.partsAt + settledMs(current.move),
			),
		);
	};

	const close = () => {
		const id = openRef.current;
		const slot = id ? deck.slotOf(id) : undefined;
		if (!id || !slot) return;
		const { motion: context, feel: current } = live.current;
		const token = ++run.current;
		stopCues();
		const card = deck.valuesOf(id);
		/* a Card opened next rises over this one while it shrinks */
		card.z.set(COVER_Z - 1);
		const scroller = frameRef.current?.querySelector(
			`[data-card-id="${id}"] [data-scroller]`,
		);
		if (scroller) scroller.scrollTop = 0;
		const land = () => {
			if (run.current !== token) return;
			deck.release(id);
			card.z.set(restZ.current);
		};
		if (context.reduce) {
			record("close", id, 2 * REDUCED_FADE_MS);
			swapUnseen(card, null, slot, token, () => {}, land);
			return;
		}
		const landing = landingMs(current.move);
		flip(
			null,
			transition(moveSpec(current.move), context),
			transition({ ms: REVEAL_MS, delayMs: landing }, context),
		);
		record("close", id, settledMs(current.move));
		void glideBox(card, slot, current.move, context).then(land);
	};

	/* the open Cover follows the frame as the window changes */
	const { valuesOf } = deck;
	useEffect(() => {
		const id = openRef.current;
		if (!id) return;
		const { motion: context, feel: current } = live.current;
		void glideBox(valuesOf(id), coverRect(frame), current.move, context);
	}, [frame, valuesOf]);

	useEffect(() => {
		/* on the document, so it runs before the Inspector's window listener,
		   which leaves an Escape that closed a Cover alone */
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || !openRef.current) return;
			event.preventDefault();
			close();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	});

	useEffect(() => () => stopCues(), []);

	const leave = motion.reduce
		? INSTANT
		: transition({ ms: LEAVE_MS }, motion);
	return { openId, parts, cardFade, leave, reveal, open, close };
}
