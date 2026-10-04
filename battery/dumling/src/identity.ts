import type { Language, Lemma, Reading } from "./types.js";
import {
	foldCase,
	normalizeEmojiDescription,
	normalizeForm,
} from "./validation/semantics.js";

/**
 * A Canonical Form as Lemma identity compares it: normalized as parsing
 * normalizes it, then case-folded by the language's rules (system ADR 0002).
 * `Um ... willen` and `um … willen` give one key. Consumers that compare a
 * bare Canonical Form, such as a Unit Shadow's, use this key so they agree
 * with {@link lemmaIdentityKey}.
 */
export function canonicalFormKey(
	canonicalForm: string,
	language: Language,
): string {
	return foldCase(normalizeForm(canonicalForm), language);
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
 *
 * A Syncretism's key adds its `syncretic` list, the features it leaves open,
 * as stored (system ADR 0046). Its units are content, not identity, so its
 * view has the same key. An ordinary Lemma has no list, so no Syncretism
 * shares its key.
 */
export function lemmaIdentityKey(lemma: Lemma): string {
	const { language, family, kind, canonicalForm } = lemma;
	const core = lemma.coreFeatures as Readonly<Record<string, unknown>>;
	const { syncretic } = lemma as { syncretic?: readonly string[] };
	return JSON.stringify([
		language,
		family,
		kind,
		canonicalFormKey(canonicalForm, language),
		Object.entries(core)
			.filter(([, value]) => value !== null && value !== undefined)
			.toSorted(([left], [right]) =>
				left < right ? -1 : left > right ? 1 : 0,
			),
		...(syncretic === undefined ? [] : [syncretic]),
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

/** Whether two Readings are one Reading, by {@link readingIdentityKey}. */
export function sameReading(left: Reading, right: Reading): boolean {
	return readingIdentityKey(left) === readingIdentityKey(right);
}
