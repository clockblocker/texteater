import { useEffect, useState } from "react";
import { type Beat, dwellMs } from "./timeline";

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
 * One Card's clock. Autoplay rests on each beat for its dwell, then moves
 * on; on the last beat it stops, or with `loop` morphs back to the first
 * and goes round again. Any step or scrub takes over from it.
 */
export function usePlayback({
	beats,
	speed,
	loop,
	captions,
}: {
	readonly beats: readonly Beat[];
	readonly speed: number;
	readonly loop: boolean;
	readonly captions: boolean;
}): Playback {
	const [at, setAt] = useState(0);
	const [playing, setPlaying] = useState(false);
	const count = beats.length;
	const last = Math.max(count - 1, 0);
	const shown = Math.min(at, last);

	useEffect(() => {
		if (!playing) return;
		const beat = beats[shown];
		if (!beat || count < 2 || (shown >= last && !loop)) {
			setPlaying(false);
			return;
		}
		const timer = window.setTimeout(
			() => setAt(shown < last ? shown + 1 : 0),
			dwellMs(beat, captions) / speed,
		);
		return () => window.clearTimeout(timer);
	}, [playing, shown, last, count, loop, beats, captions, speed]);

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
				setAt(shown >= last ? 0 : shown);
				setPlaying(true);
			}
		},
		tap: () => {
			if (playing) setPlaying(false);
			else go(shown >= last ? 0 : shown + 1);
		},
		restart: (play) => {
			setAt(0);
			setPlaying(play);
		},
	};
}
