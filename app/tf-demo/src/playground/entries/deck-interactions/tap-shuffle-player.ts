import { animate } from "motion/react";
import { ease } from "./deck-of-cards-ease";
import { cue, type MotionContext, transition } from "./motion-kit";
import {
	type CardMove,
	CHANNELS,
	DISSOLVE_MS,
	keyframesOf,
	restOf,
} from "./tap-shuffle";
import type { CardValues } from "./use-deck";

/** One Card's part of a shuffle, from the tap until it lands or the Card is taken. */
type Part = {
	/** Cancels what is still to come of it, and of the part it replaced. */
	readonly cancel: () => void;
	/** A reduced part dissolves, and must not leave its Card faded. */
	readonly reduced: boolean;
};

/**
 * Plays a tap's shuffle on the Deck's Cards. Each Card's part starts on
 * Motion's frame loop at its `startMs`, from where the Card shows, and
 * all of them keep the tap's one clock: a frame that comes late starts
 * the part that far in. Each Card runs on that clock alone: every channel
 * is one keyframed tween started in that frame, and its restack and its
 * landing are cued from the same frame, so the stacking changes in the
 * frame its second leg starts. A part waiting
 * to start leaves its Card to whatever moves it until then; a part that
 * replaces another (a second tap) cancels the first as it starts.
 * Reduced, a part is a dissolve, all of them on the first beat: the Card
 * holds where it shows while it fades out in 100 ms, switches to its rest
 * and new stacking while hidden, and fades in there in 100 ms.
 *
 * Anything else that takes a Card (`take`, `takeAll`) ends its part where
 * it shows and gives it its stacking at rest; the tweens it had started
 * run on until the taker's own move replaces them.
 */
export function createTapShufflePlayer({
	valuesOf,
	zOf,
	restZ,
	onIdle,
}: {
	readonly valuesOf: (id: string) => CardValues;
	/** The stacking of the place `index`, 0 the back. */
	readonly zOf: (index: number) => number;
	/** A Card's stacking at rest in the Deck's order now. */
	readonly restZ: (id: string) => number;
	/** Called once no Card is left in a shuffle. */
	readonly onIdle: () => void;
}) {
	const parts = new Map<string, Part>();

	/**
	 * Lands `id` in the frame its tweens end: each value is set to where
	 * that frame puts it with no speed left, so a spring started on it
	 * next (the hover fan, a reflow) starts at rest instead of running on
	 * past it with the tween's last step.
	 */
	function land(id: string, part: Part, move: CardMove, reduced: boolean) {
		if (parts.get(id) !== part) return;
		const card = valuesOf(id);
		const rest = restOf(move);
		for (const channel of CHANNELS) card[channel].jump(rest[channel]);
		if (reduced) card.o.jump(1);
		parts.delete(id);
		if (parts.size === 0) onIdle();
	}

	function travel(
		card: CardValues,
		move: CardMove,
		context: MotionContext,
		cues: (() => void)[],
		landed: () => void,
		late: number,
	) {
		const z = zOf(move.index);
		for (const channel of CHANNELS) {
			const value = card[channel];
			/* in the frame: what drove it stops where this frame puts it */
			value.stop();
			const tween = keyframesOf(value.get(), move.legs[channel]);
			animate(
				value,
				[...tween.keyframes],
				transition(
					{
						ms: tween.ms,
						times: tween.times,
						ease: tween.eases,
						delayMs: -late,
					},
					context,
				),
			);
		}
		cues.push(cue(move.zAtMs - late, () => card.z.set(z), context));
		cues.push(cue(move.ms - late, landed, context));
	}

	function dissolve(
		card: CardValues,
		move: CardMove,
		context: MotionContext,
		cues: (() => void)[],
		landed: () => void,
		late: number,
	) {
		const z = zOf(move.index);
		const rest = restOf(move);
		for (const channel of CHANNELS) card[channel].jump(card[channel].get());
		card.o.stop();
		animate(
			card.o,
			[card.o.get(), 0, 1],
			transition(
				{
					ms: 2 * DISSOLVE_MS,
					times: [0, 0.5, 1],
					ease: [ease.linear, ease.linear],
					delayMs: -late,
				},
				context,
			),
		);
		cues.push(
			cue(
				DISSOLVE_MS - late,
				() => {
					for (const channel of CHANNELS)
						card[channel].jump(rest[channel]);
					card.z.set(z);
				},
				context,
			),
		);
		cues.push(cue(2 * DISSOLVE_MS - late, landed, context));
	}

	function play(moves: readonly CardMove[], context: MotionContext) {
		for (const move of moves) {
			const card = valuesOf(move.id);
			let before = parts.get(move.id);
			const cues: (() => void)[] = [];
			const part: Part = {
				reduced: context.reduce,
				cancel: () => {
					before?.cancel();
					before = undefined;
					for (const stop of cues.splice(0)) stop();
				},
			};
			parts.set(move.id, part);
			const landed = () => land(move.id, part, move, context.reduce);
			cues.push(
				cue(
					context.reduce ? move.reducedStartMs : move.startMs,
					(late) => {
						before?.cancel();
						before = undefined;
						if (context.reduce)
							dissolve(card, move, context, cues, landed, late);
						else travel(card, move, context, cues, landed, late);
					},
					context,
				),
			);
		}
	}

	/** Ends `id`'s part where it shows: it rests at its own stacking, and solid. */
	function take(id: string) {
		const part = parts.get(id);
		if (!part) return;
		part.cancel();
		parts.delete(id);
		const card = valuesOf(id);
		card.z.set(restZ(id));
		if (part.reduced) card.o.jump(1);
		if (parts.size === 0) onIdle();
	}

	return {
		play,
		take,
		takeAll: () => {
			for (const id of [...parts.keys()]) take(id);
		},
		/** Drops every part, for a Deck about to be placed afresh. */
		clear: () => {
			for (const part of parts.values()) part.cancel();
			const busy = parts.size > 0;
			parts.clear();
			if (busy) onIdle();
		},
		has: (id: string) => parts.has(id),
		get size() {
			return parts.size;
		},
	};
}
