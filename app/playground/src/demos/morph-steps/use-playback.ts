import { useEffect, useState } from "react";
import { type Beat, boundariesOf, dwellMs } from "./timeline";

export type Playback = {
	/** The beat shown. */
	readonly at: number;
	readonly count: number;
	readonly playing: boolean;
	/** On the last beat and stopped: Play reads as Replay. */
	readonly ended: boolean;
	/** Shows a beat and stops, as a scrub or a step does. */
	readonly go: (index: number) => void;
	readonly next: () => void;
	readonly previous: () => void;
	/** Play, pause, or replay from the first beat. */
	readonly toggle: () => void;
	/** A tap on the words: pause while playing, else one step on. */
	readonly tap: () => void;
	/** Back to the first beat, playing or waiting for a tap. */
	readonly restart: (playing: boolean) => void;
};

/**
 * The timeline's clock. Autoplay rests on each beat for its dwell, then
 * moves on; on a stage's boundary it stops when `pauseAtBoundary` is on,
 * and Play goes on from there into the next stage. On the last beat it
 * stops, or with `loop` morphs back to the first and goes round again.
 * Any step or scrub takes over from it.
 */
export function usePlayback({
	beats,
	pauseAtBoundary,
	speed,
	loop,
	captions,
}: {
	readonly beats: readonly Beat[];
	/** Play stops by itself on each stage's result before the last. */
	readonly pauseAtBoundary: boolean;
	readonly speed: number;
	readonly loop: boolean;
	readonly captions: boolean;
}): Playback {
	const [at, setAt] = useState(0);
	const [playing, setPlaying] = useState(false);
	// Where play last started: a hold it starts on does not stop it again.
	const [from, setFrom] = useState(0);
	const count = beats.length;
	const last = count - 1;
	const shown = Math.min(at, last);

	useEffect(() => {
		if (!playing) return;
		const beat = beats[shown];
		if (!beat) return;
		if (
			(shown >= last && !loop) ||
			(pauseAtBoundary &&
				shown !== from &&
				boundariesOf(beats).includes(shown))
		) {
			setPlaying(false);
			return;
		}
		const timer = window.setTimeout(() => {
			if (shown < last) return setAt(shown + 1);
			// A new round rests on the boundary again.
			setAt(0);
			setFrom(0);
		}, dwellMs(beat, captions) / speed);
		return () => window.clearTimeout(timer);
	}, [
		playing,
		shown,
		last,
		loop,
		pauseAtBoundary,
		from,
		beats,
		captions,
		speed,
	]);

	const go = (index: number) => {
		setPlaying(false);
		setAt(Math.max(0, Math.min(index, last)));
	};
	const ended = shown >= last && !playing;
	return {
		at: shown,
		count,
		playing,
		ended,
		go,
		next: () => go(shown + 1),
		previous: () => go(shown - 1),
		toggle: () => {
			if (playing) setPlaying(false);
			else {
				const start = shown >= last ? 0 : shown;
				setAt(start);
				setFrom(start);
				setPlaying(true);
			}
		},
		tap: () => {
			if (playing) setPlaying(false);
			else go(shown >= last ? 0 : shown + 1);
		},
		restart: (play) => {
			setAt(0);
			setFrom(0);
			setPlaying(play);
		},
	};
}
