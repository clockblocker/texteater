import type { Step } from "./cases";

/**
 * How the chain of steps reads, after Yomitan and 10ten Reader. Both list
 * a form's deinflection reasons from the dictionary form outward, the rule
 * nearest the lemma first, with a separator that points back at the lemma:
 * Yomitan `negative « past` on its own line under the headword, 10ten
 * `(< negative < past)` after the headword. Read from the clicked words
 * instead, the same steps run the other way, and so does the separator.
 */

/** `lemma`: Yomitan's and 10ten's order; `words`: the reader's. */
export type ChainOrder = "lemma" | "words";

/** `yomitan`: `«`, the chain on a line of its own; `tenten`: `<`. */
export type ChainStyle = "yomitan" | "tenten";

export type StepNames = "terse" | "plain";

/** The steps in the order the chain shows them. */
export function ordered(
	steps: readonly Step[],
	order: ChainOrder,
): readonly Step[] {
	return order === "lemma" ? [...steps].reverse() : steps;
}

/**
 * The separator between two steps, pointing at the lemma: Yomitan's
 * `«` (U+00AB) and 10ten's `<`, mirrored when the chain starts from the
 * clicked words.
 */
export function separator(style: ChainStyle, order: ChainOrder): string {
	if (style === "yomitan") return order === "lemma" ? "«" : "»";
	return order === "lemma" ? "<" : ">";
}

export function nameOf(step: Step, names: StepNames): string {
	return names === "terse" ? step.terse : step.plain;
}

/** A run of a step's `about`: English, or the target language. */
export type AboutRun = { readonly text: string; readonly target: boolean };

/** `about` cut into runs; `_word_` marks a target-language run. */
export function aboutRuns(about: string): readonly AboutRun[] {
	return about
		.split(/(_[^_]+_)/u)
		.filter((part) => part !== "")
		.map((part) =>
			/^_[^_]+_$/u.test(part)
				? { text: part.slice(1, -1), target: true }
				: { text: part, target: false },
		);
}

/** `about` without its marks, for a tooltip. */
export function plainAbout(about: string): string {
	return aboutRuns(about)
		.map((run) => run.text)
		.join("");
}
