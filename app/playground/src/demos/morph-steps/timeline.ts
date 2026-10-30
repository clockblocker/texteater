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
	 * open place in the lemma, such as `jM`; `preposition`: the word a slot
	 * is governed by, such as `mit`. The last two wear tf-demo's valency
	 * styles.
	 */
	readonly kind?: "ghost" | "slot" | "preposition";
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
 * One Card's metamorphosis, one of the two steps between the three forms:
 * the Attestation Card's Syntax takes the words on the page to the
 * Surface, and the Surface Card's Inflection takes the Surface to the
 * Lemma.
 */
export type Track = {
	/** What the track does: `Syntax`, `Inflection`. */
	readonly name: string;
	/** The form the Card heads: the clicked words, or the Surface. */
	readonly start: Frame;
	/** Its steps; the last is its result, where it rests. */
	readonly frames: readonly Frame[];
	/** The form it ends on, which the Card links to: `Surface`, `Lemma`. */
	readonly result: string;
};

/** A frame in its place on the track. */
export type Beat = {
	readonly frame: Frame;
	/** The form this beat rests on, on the track's last frame. */
	readonly result?: string;
};

export function beatsOf(track: Track): Beat[] {
	return [
		{ frame: track.start },
		...track.frames.map((frame, at) =>
			at === track.frames.length - 1
				? { frame, result: track.result }
				: { frame },
		),
	];
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
function plainCaption(caption: string): string {
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
	// The track's result gets a longer look before a loop goes round.
	return 1300 + reading + (beat.result === undefined ? 0 : 900);
}
