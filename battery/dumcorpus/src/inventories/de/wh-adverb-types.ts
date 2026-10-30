import type * as Dumling from "dumling/types";
import type { SplitAdverbParts } from "./pronominal-adverbs.js";

/**
 * The shapes the w-adverb tables author in (`wh-adverbs.ts`,
 * `wh-adverb-places.ts`).
 */

export type Lemma = Dumling.Lemma<"de", "Lexeme", "ADV">;
/**
 * The series of a Reading: interrogative, relative, indefinite, negative or
 * demonstrative. Its marker leads the Emoji Description, and no Core feature
 * carries it (system ADR 0029).
 */
export type Use = "Int" | "Rel" | "Ind" | "Neg" | "Dem";

/** One Reading of a w-adverb's use: its definition and glosses. */
type Meaning = {
	readonly definition: string;
	readonly en: readonly string[];
	readonly ru: readonly string[];
};
/**
 * The head and tail a directional adverb splits into, with words between
 * them (Wo kommst du her? Da gehe ich hin; Rule de/split-adverb-is-one-target).
 */
type Split = Omit<SplitAdverbParts, "form">;
/** A Reading of a use that has several, each with its own emoji. */
export type EmojiMeaning = Meaning & { readonly emoji: string };
/**
 * One w-adverb with its interrogative and relative use, each a Reading of the
 * one Lemma (system ADR 0029). A use is one Reading under the adverb's emoji,
 * or several Readings with an emoji each.
 * `synonymOf` names the adverb this one is a synonym of in both uses; only
 * that direct claim is stored, and the rest is projected (ADR 0012).
 */
export type WhAdverb = {
	readonly text: string;
	readonly ipa: string;
	readonly emoji: string;
	readonly synonymOf?: string;
	readonly split?: Split;
	readonly Int: Meaning | readonly EmojiMeaning[];
	readonly Rel: Meaning | readonly EmojiMeaning[];
};

/** An adverb with a single use and one Reading. */
export type OneReadingAdverb = Meaning & {
	readonly text: string;
	readonly ipa: string;
	readonly emoji: string;
	readonly synonymOf?: string;
	readonly split?: Split;
};

/** An adverb with one Reading or several, each under its own emoji. */
export type ManyReadingAdverb = Pick<
	OneReadingAdverb,
	"text" | "ipa" | "split"
> & {
	readonly readings: readonly EmojiMeaning[];
};
