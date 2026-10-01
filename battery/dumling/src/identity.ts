import type { Language, Lemma, Reading } from "./types.js";
import {
	normalizeEmojiDescription,
	normalizeForm,
} from "./validation/semantics.js";

/**
 * Folds letter case by the language's own rules, so spellings that differ
 * only in case compare equal: `LOL` and `lol` both fold to `lol`. Lemma
 * identity compares Canonical Forms this way (system ADR 0002). Hebrew has no
 * case and folds to itself.
 */
export function foldCase(value: string, language: Language): string {
	return value.toLocaleLowerCase(language);
}

/**
 * The key of a Lemma's identity: language, Family, Kind, Core Features and
 * the case-folded Canonical Form (system ADR 0002). Two Lemmas are one Lemma
 * exactly when their keys are equal, so the INTJ `LOL` and `lol` are one,
 * while the NOUN `Morgen` and the ADV `morgen` differ by Kind. The display
 * casing of the Canonical Form is not part of the key. The Canonical Form is
 * normalized as parsing would normalize it, and Core Features count by their
 * set values, so key order and a missing versus a `null` feature don't
 * matter.
 */
export function lemmaIdentityKey(lemma: Lemma): string {
	const { language, family, kind, canonicalForm } = lemma;
	const core = lemma.coreFeatures as Readonly<Record<string, unknown>>;
	return JSON.stringify([
		language,
		family,
		kind,
		foldCase(normalizeForm(canonicalForm), language),
		Object.entries(core)
			.filter(([, value]) => value !== null && value !== undefined)
			.toSorted(([left], [right]) =>
				left < right ? -1 : left > right ? 1 : 0,
			),
	]);
}

/** Whether two Lemmas are one Lemma, by {@link lemmaIdentityKey}. */
export function sameLemma(left: Lemma, right: Lemma): boolean {
	return lemmaIdentityKey(left) === lemmaIdentityKey(right);
}

/**
 * The key of a Reading's identity within one dictionary scope: its Lemma's
 * {@link lemmaIdentityKey} and its Emoji Description, compared without
 * variation selectors or skin-tone modifiers (ADR 0031). A Foreign Reading has
 * no Emoji Description, so its Lemma alone identifies it (ADR 0045).
 */
export function readingIdentityKey(reading: Reading): string {
	const { emojiDescription } = reading as { emojiDescription?: string };
	return JSON.stringify([
		lemmaIdentityKey(reading.lemma),
		emojiDescription === undefined
			? null
			: normalizeEmojiDescription(emojiDescription),
	]);
}
