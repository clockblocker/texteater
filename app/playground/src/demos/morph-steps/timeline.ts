/**
 * The metamorphosis as a timeline of frames, after Keynote's Magic Move:
 * each frame is a whole state of the clicked words, and going from one
 * frame to the next moves what both share, fades out what only the first
 * has and fades in what only the second has. A word keeps its `id` across
 * frames, so it travels; a piece of a word keeps its `id` inside its word,
 * so `ha` stays while `tte` leaves and `ben` arrives.
 */

/** A piece of a word: an ending, a stem, or the whole word. */
export type Piece = {
	/** Stable within its word across frames. */
	readonly id: string;
	readonly text: string;
	/** The part this frame is about, set in the link colour. */
	readonly focus?: boolean;
};

export type StageWord = {
	/** Stable across frames: the same word moves instead of fading. */
	readonly id: string;
	readonly pieces: readonly Piece[];
	/**
	 * `ghost`: the sentence around the clicked words, quiet; `slot`: an
	 * open place in the lemma, such as `jM`.
	 */
	readonly kind?: "ghost" | "slot";
	/** A ghost the caption points at, a step brighter. */
	readonly lit?: boolean;
	/** Sits against the word before it, with no space: `da` + `mit`. */
	readonly glue?: boolean;
	/** A short gloss under the word, such as `past · 3rd sg`. */
	readonly tag?: string;
	/** A gendered lemma's hue, for `das Kind`. */
	readonly tone?: "neuter";
};

export type Frame = {
	readonly words: readonly StageWord[];
	/** One line; German runs are wrapped in `*…*`. */
	readonly caption: string;
};

/**
 * One of the two named steps between the three forms: Syntax takes the
 * Attestation to the Surface, Inflection takes the Surface to the Lemma.
 */
export type Stage = {
	/** What the stage does: `Syntax`, `Inflection`. */
	readonly name: string;
	/** The form it ends on: `Surface`, `Lemma`. */
	readonly result: string;
	/** Its steps; the last is its result, where it rests. */
	readonly frames: readonly Frame[];
};

/** The words on the page, then each stage's steps. */
export type Timeline = {
	/** The Attestation: the clicked words as the page has them. */
	readonly start: Frame;
	readonly stages: readonly Stage[];
};

/** A frame in its place on the timeline. */
export type Beat = {
	readonly frame: Frame;
	/** The stage it belongs to; the start belongs to the first. */
	readonly stage: number;
	/** The form this beat rests on, on a stage's last frame. */
	readonly result?: string;
};

export function beatsOf(timeline: Timeline): Beat[] {
	return [
		{ frame: timeline.start, stage: 0 },
		...timeline.stages.flatMap((stage, index) =>
			stage.frames.map((frame, at) =>
				at === stage.frames.length - 1
					? { frame, stage: index, result: stage.result }
					: { frame, stage: index },
			),
		),
	];
}

/** The beats a stage rests on before the next stage starts. */
export function boundariesOf(beats: readonly Beat[]): number[] {
	return beats.flatMap((beat, index) =>
		beat.result !== undefined && index < beats.length - 1 ? [index] : [],
	);
}

/** Words that sit together, glued ones in one unbreakable run. */
export type Cluster = {
	/** The first word's id: the run keeps it while its words change. */
	readonly key: string;
	readonly words: readonly StageWord[];
};

export function clustersOf(words: readonly StageWord[]): Cluster[] {
	const clusters: { key: string; words: StageWord[] }[] = [];
	for (const word of words) {
		const last = clusters.at(-1);
		if (word.glue && last) last.words.push(word);
		else clusters.push({ key: word.id, words: [word] });
	}
	return clusters;
}

/**
 * Keynote's "Match: By Word": a word whose text changes is a new object,
 * so it cross-fades whole instead of keeping the letters it shares.
 */
export function matchByWord(word: StageWord): StageWord {
	const text = word.pieces.map((piece) => piece.text).join("");
	return {
		...word,
		pieces: [
			{
				id: text,
				text,
				focus: word.pieces.some((piece) => piece.focus),
			},
		],
	};
}

/** What a frame reads as, without its ghosts: `mit jM zu tun haben`. */
export function frameText(frame: Frame): string {
	return clustersOf(frame.words.filter((word) => word.kind !== "ghost"))
		.map((cluster) =>
			cluster.words
				.map((word) => word.pieces.map((piece) => piece.text).join(""))
				.join(""),
		)
		.join(" ");
}

/** A caption's text with its `*German*` marks dropped. */
export function plainCaption(caption: string): string {
	return caption.replaceAll("*", "");
}

/** A caption as runs: English, and German where it was `*…*`. */
export function captionRuns(
	caption: string,
): { readonly text: string; readonly german: boolean }[] {
	return caption
		.split("*")
		.map((text, index) => ({ text, german: index % 2 === 1 }))
		.filter((run) => run.text !== "");
}

/**
 * How long a beat stays before autoplay moves on, in ms at 1×: a beat
 * for the move, then reading time for the caption when it is shown.
 */
export function dwellMs(beat: Beat, captions: boolean): number {
	const reading = captions ? plainCaption(beat.frame.caption).length * 42 : 0;
	// A stage's result gets a longer look, even when play runs on.
	return 1300 + reading + (beat.result === undefined ? 0 : 900);
}
