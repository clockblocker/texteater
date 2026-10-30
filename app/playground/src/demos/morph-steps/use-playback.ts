import { useEffect, useState } from "react";
import { dwellMs, type Frame } from "./timeline";

export type Playback = {
	/** The frame shown. */
	readonly at: number;
	readonly count: number;
	readonly playing: boolean;
	/** On the last frame and stopped: Play reads as Replay. */
	readonly ended: boolean;
	/** Shows a frame and stops, as a scrub or a step does. */
	readonly go: (index: number) => void;
	readonly next: () => void;
	readonly previous: () => void;
	/** Play, pause, or replay from the first frame. */
	readonly toggle: () => void;
	/** A tap on the words: pause while playing, else one step on. */
	readonly tap: () => void;
	/** Back to the first frame, playing or waiting for a tap. */
	readonly restart: (playing: boolean) => void;
};

/**
 * The timeline's clock. Autoplay rests on each frame for its dwell, then
 * moves on; on the last frame it stops, or with `loop` morphs back to the
 * first and goes round again. Any step or scrub takes over from it.
 */
export function usePlayback({
	frames,
	speed,
	loop,
	captions,
}: {
	readonly frames: readonly Frame[];
	readonly speed: number;
	readonly loop: boolean;
	readonly captions: boolean;
}): Playback {
	const [at, setAt] = useState(0);
	const [playing, setPlaying] = useState(false);
	const count = frames.length;
	const last = count - 1;
	const shown = Math.min(at, last);

	useEffect(() => {
		if (!playing) return;
		const frame = frames[shown];
		if (!frame) return;
		if (shown >= last && !loop) {
			setPlaying(false);
			return;
		}
		const timer = window.setTimeout(
			() => setAt(shown >= last ? 0 : shown + 1),
			dwellMs(frame, captions) / speed,
		);
		return () => window.clearTimeout(timer);
	}, [playing, shown, last, loop, frames, captions, speed]);

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
				if (shown >= last) setAt(0);
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
