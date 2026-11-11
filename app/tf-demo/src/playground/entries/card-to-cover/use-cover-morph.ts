import {
	animate,
	frame as motionFrame,
	motionValue,
	type Transition,
} from "motion/react";
import {
	type RefObject,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { flushSync } from "react-dom";
import type { Rect } from "../deck-interactions/geometry";
import type { Frame } from "../deck-interactions/layout";
import {
	cue,
	type MotionContext,
	transition,
	tweenTo,
} from "../deck-interactions/motion-kit";
import type { CardValues, Deck } from "../deck-interactions/use-deck";
import {
	BOX,
	flipParts,
	type Glide,
	glide,
	makePartOffsets,
	type PartOffsets,
	SHARED_PARTS,
} from "./box-glide";
import { coverCardById, MAX_COVER_ONLY } from "./cover-deck";
import type { Reveal } from "./cover-face";
import type { Recorder } from "./recorder";
import {
	LEAVE_MS,
	landingMs,
	type MorphFeel,
	moveSpec,
	openTimeline,
	REDUCED_FADE_MS,
	REVEAL_MS,
	RISE_PX,
	settledMs,
} from "./timing";

/** The room the prototype's Cover keeps from its frame, and the widest it grows. */
const COVER_INSET_PX = 24;
const COVER_MAX_PX = 720;

/**
 * The Cover this prototype grows a Card into: a column of its own, as
 * #1311 measured the morph, rather than the app's Cover box.
 */
function coverRect(frame: Frame): Rect {
	const w = Math.min(COVER_MAX_PX, frame.w - 2 * COVER_INSET_PX);
	return {
		u: (frame.w - w) / 2,
		v: COVER_INSET_PX,
		w,
		h: frame.h - 2 * COVER_INSET_PX,
	};
}

const COVER_Z = 200;
/** A change of form nobody sees move: the reduced swap, behind a fade. */
export const INSTANT: Transition = { duration: 0 };

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
 * The first prototype's glide: each of `u v w h` on its own animation of
 * `spec`, all from one start and from rest, while Motion's layout
 * projection moves the parts on its own.
 */
function glideValues(card: CardValues, to: Rect, spec: Transition): Glide {
	for (const key of BOX) card[key].jump(card[key].get());
	const animations = BOX.map((key) => animate(card[key], to[key], spec));
	let stopped = false;
	return {
		stop: () => {
			stopped = true;
			for (const animation of animations) animation.stop();
		},
		finished: Promise.all(animations.map((a) => a.finished)).then(
			() => !stopped,
		),
	};
}

/**
 * One Card at a time grows into its Cover and back: the same element,
 * whose box glides on its own values while its face's parts move to their
 * new places, and whose Cover-only parts fade and rise in after the move,
 * started by motion-kit's `cue`. On the box clock the parts' offsets are a
 * FLIP measured in the box's own layout, riding the box's own progress;
 * on the layout clock Motion's projection moves them. Reduced, the element
 * fades out at the Card's box and in at the Cover's, `REDUCED_FADE_MS`
 * each way. Every open and close is recorded for the inspector. `open`
 * and `close` keep their identity across renders.
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
	/** The Card whose form changed last: the only one the transitions below reach. */
	const [activeId, setActiveId] = useState<string | null>(null);
	/** What Motion's projection moves the parts on (layout clock). */
	const [parts, setParts] = useState<Transition>(INSTANT);
	/** How the Card's clip fade comes back after the latest close. */
	const [cardFade, setCardFade] = useState<Transition>(INSTANT);
	const [reveal] = useState(() => makeReveal(MAX_COVER_ONLY));
	const [offsets] = useState(() => new Map<string, PartOffsets>());
	const openRef = useRef<string | null>(null);
	/** Bumped by every open and close, so a stale continuation stops. */
	const run = useRef(0);
	const cues = useRef<(() => void)[]>([]);
	const glides = useRef(new Map<string, Glide>());
	/** Where the open Card stacked before it rose into the Cover. */
	const restZ = useRef(0);
	const live = useRef({ deck, motion, feel, frame, rtl });
	live.current = { deck, motion, feel, frame, rtl };

	const offsetsOf = useCallback(
		(id: string): PartOffsets => {
			let found = offsets.get(id);
			if (!found) {
				found = makePartOffsets();
				offsets.set(id, found);
			}
			return found;
		},
		[offsets],
	);

	const morph = useState(() => {
		const stopCues = () => {
			for (const cancel of cues.current) cancel();
			cues.current = [];
		};
		const boxOf = (id: string) =>
			frameRef.current?.querySelector<HTMLElement>(
				`[data-card-id="${id}"]`,
			) ?? null;
		const dpr = () =>
			live.current.feel.snap ? window.devicePixelRatio || 1 : null;
		/** Starts `id`'s glide to `to`, stopping the one it had. */
		const start = (id: string, next: Glide) => {
			glides.current.get(id)?.stop();
			glides.current.set(id, next);
			return next.finished;
		};
		const commit = (
			id: string | null,
			active: string,
			next: Transition | null,
			fade: Transition,
		) => {
			openRef.current = id;
			flushSync(() => {
				if (next) setParts(next);
				setCardFade(fade);
				setActiveId(active);
				setOpenId(id);
			});
		};
		/**
		 * The change of form and the move that follows it, on the clock the
		 * feel names. On the box clock the parts' FLIP is measured around
		 * the commit; the box keeps its size until the glide moves it.
		 */
		const change = (
			id: string,
			open: boolean,
			to: Rect,
			partsDelayMs: number,
			fade: Transition,
		): Promise<boolean> => {
			const { motion: context, feel } = live.current;
			const card = live.current.deck.valuesOf(id);
			const spec = transition(moveSpec(feel.move), context);
			const form = open ? id : null;
			if (feel.clock === "layout") {
				commit(
					form,
					id,
					transition(
						{ ...moveSpec(feel.move), delayMs: partsDelayMs },
						context,
					),
					fade,
				);
				return start(id, glideValues(card, to, spec));
			}
			const box = boxOf(id);
			const flip = flipParts(box, offsetsOf(id), () =>
				commit(form, id, null, fade),
			);
			if (box && flip) report(box, flip.placed);
			return start(
				id,
				glide({
					card,
					to,
					spec,
					dpr: dpr(),
					start: feel.start,
					parts: flip
						? {
								offsets: offsetsOf(id),
								start: flip.start,
								ownSpec:
									partsDelayMs > 0
										? transition(
												{
													...moveSpec(feel.move),
													delayMs: partsDelayMs,
												},
												context,
											)
										: undefined,
							}
						: undefined,
				}),
			);
		};
		/**
		 * The parts' new places as Motion's `onLayoutMeasure` reports them:
		 * page px with the box's own translation taken off.
		 */
		const report = (
			box: HTMLElement,
			placed: Readonly<Record<string, DOMRect>>,
		) => {
			const frame = frameRef.current;
			if (!frame) return;
			const outer = frame.getBoundingClientRect();
			const drawn = box.getBoundingClientRect();
			const dx =
				drawn.left - (outer.left + frame.clientLeft + box.offsetLeft);
			const dy =
				drawn.top - (outer.top + frame.clientTop + box.offsetTop);
			for (const [name, rect] of Object.entries(placed))
				recorder.measured(name, {
					x: { min: rect.left - dx, max: rect.right - dx },
					y: { min: rect.top - dy, max: rect.bottom - dy },
				});
		};
		const record = (kind: "open" | "close", id: string, minMs: number) => {
			const element = frameRef.current;
			if (element)
				recorder.start({
					kind,
					id,
					rtl: live.current.rtl,
					frame: element,
					minMs: minMs / live.current.motion.timeScale,
				});
		};
		/**
		 * The reduced change of form: the element fades out where it is,
		 * takes its new form and box unseen, and fades in at `to`. Motion
		 * draws every layout change, an instant one too, at its start for
		 * one frame before it moves it, so the box swaps and the fade-in
		 * starts only once Motion's next frame has put the parts in their
		 * new places.
		 */
		const swapUnseen = (
			card: CardValues,
			id: string,
			open: boolean,
			to: Rect,
			token: number,
			show: () => void,
			then?: () => void,
		) => {
			const context = live.current.motion;
			glides.current.get(id)?.stop();
			void tweenTo(card.o, 0, REDUCED_FADE_MS, context).finished.then(
				() => {
					if (run.current !== token) return;
					commit(open ? id : null, id, INSTANT, INSTANT);
					const drawn = offsetsOf(id);
					for (const name of SHARED_PARTS) {
						drawn[name].x.jump(0);
						drawn[name].y.jump(0);
					}
					motionFrame.postRender(() => {
						if (run.current !== token) return;
						for (const key of BOX) card[key].jump(to[key]);
						show();
						void tweenTo(
							card.o,
							1,
							REDUCED_FADE_MS,
							context,
						).finished.then(() => then?.());
					});
				},
			);
		};

		const open = (id: string) => {
			if (openRef.current !== null) return;
			const { motion: context, feel, frame: size, deck } = live.current;
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
				swapUnseen(card, id, true, to, token, () => {
					for (const value of reveal.opacity) value.jump(1);
					for (const value of reveal.y) value.jump(0);
				});
				return;
			}
			const count = 1 + (coverCardById(id)?.coverContexts.length ?? 0);
			const timeline = openTimeline(feel, count);
			record(
				"open",
				id,
				Math.max(
					(timeline.revealAt.at(-1) ?? 0) + REVEAL_MS,
					timeline.partsAt + settledMs(feel.move),
				),
			);
			void change(id, true, to, timeline.partsAt, INSTANT);
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
		};

		const close = () => {
			const id = openRef.current;
			const { deck, motion: context, feel } = live.current;
			const slot = id ? deck.slotOf(id) : undefined;
			if (!id || !slot) return;
			const token = ++run.current;
			stopCues();
			const card = deck.valuesOf(id);
			/* a Card opened next rises over this one while it shrinks */
			card.z.set(COVER_Z - 1);
			const scroller = boxOf(id)?.querySelector("[data-scroller]");
			if (scroller) scroller.scrollTop = 0;
			const land = () => {
				if (run.current !== token) return;
				live.current.deck.release(id);
				card.z.set(restZ.current);
			};
			if (context.reduce) {
				record("close", id, 2 * REDUCED_FADE_MS);
				swapUnseen(card, id, false, slot, token, () => {}, land);
				return;
			}
			const landing = landingMs(feel.move);
			record("close", id, settledMs(feel.move));
			void change(
				id,
				false,
				slot,
				0,
				transition({ ms: REVEAL_MS, delayMs: landing }, context),
			).then((landed) => {
				if (landed) land();
			});
		};

		/** The open Cover follows the frame as the window changes. */
		const follow = (size: Frame) => {
			const id = openRef.current;
			if (!id) return;
			const { motion: context, feel, deck } = live.current;
			const card = deck.valuesOf(id);
			const spec = transition(moveSpec(feel.move), context);
			void start(
				id,
				feel.clock === "layout"
					? glideValues(card, coverRect(size), spec)
					: glide({
							card,
							to: coverRect(size),
							spec,
							dpr: dpr(),
							start: feel.start,
						}),
			);
		};

		return { open, close, follow, stopCues };
	})[0];

	useEffect(() => {
		morph.follow(frame);
	}, [frame, morph]);

	useEffect(() => {
		/* on the document, so it runs before the Inspector's window listener,
		   which leaves an Escape that closed a Cover alone */
		const onKey = (event: KeyboardEvent) => {
			if (event.key !== "Escape" || !openRef.current) return;
			event.preventDefault();
			morph.close();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [morph]);

	useEffect(() => () => morph.stopCues(), [morph]);

	const leave = useMemo(
		() => (motion.reduce ? INSTANT : transition({ ms: LEAVE_MS }, motion)),
		[motion],
	);

	return {
		openId,
		activeId,
		parts,
		cardFade,
		leave,
		reveal,
		offsetsOf,
		open: morph.open,
		close: morph.close,
	};
}
