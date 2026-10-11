import type { FakeCard } from "./resolution";
import type { FixtureLanguage } from "./text";

/** A run of text: a target language, or English for glosses and notes. */
export type RunLanguage = FixtureLanguage | "en";

/**
 * `lang` and `dir` for one run of text, so it keeps its own direction (and
 * its punctuation on the right side) inside a frame of the other one.
 */
export function langAttrs(lang: RunLanguage): {
	readonly lang: RunLanguage;
	readonly dir: "ltr" | "rtl";
} {
	return { lang, dir: lang === "he" ? "rtl" : "ltr" };
}

/** The target language a Card is about, read from its title's script. */
export function cardLang(card: FakeCard): FixtureLanguage {
	return /\p{Script=Hebrew}/u.test(card.title) ? "he" : "de";
}
