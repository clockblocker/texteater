import {
	canonicalFormKey,
	lemmaIdentityKey as dumlingLemmaIdentityKey,
	readingIdentityKey as dumlingReadingIdentityKey,
} from "dumling";
import type * as Dumling from "dumling/types";
import { parseUnitAs } from "./operationalParsing";

/**
 * tf-demo's database key for a Lemma: Dumling's case-folded Lemma identity
 * key of the parsed value, so INTJ `LOL` and `lol` share one row (system ADR
 * 0002). The row keeps the Canonical Form's display casing.
 */
export function lemmaIdentityKey<L extends Dumling.Language>(
	lemma: Dumling.Lemma<L>,
): string;
export function lemmaIdentityKey(lemma: unknown): string;
export function lemmaIdentityKey(lemma: unknown): string {
	return dumlingLemmaIdentityKey(parseUnitAs(lemma, "Lemma"));
}

/**
 * A Lemma's or Unit Shadow's Canonical Form keyed as Lemma identity keys it:
 * Dumling's Canonical Form key, normalized and case-folded (system ADR 0002).
 * Indexes that find Lemmas by form use it, and the rows keep the display
 * casing for rendering.
 */
export function foldedCanonicalForm(value: {
	readonly language: Dumling.Language;
	readonly canonicalForm: string;
}): string {
	return canonicalFormKey(value.canonicalForm, value.language);
}

/** A Reading's Emoji Description; a Foreign Reading has none (ADR 0045). */
export function emojiDescriptionOf(
	reading: Dumling.Reading,
): string | undefined {
	return "emojiDescription" in reading ? reading.emojiDescription : undefined;
}

/**
 * tf-demo's database key for a Reading: Dumling's Reading identity key of the
 * parsed value, its Lemma's case-folded key and its Emoji Description.
 */
export function readingIdentityKey(reading: unknown): string {
	return dumlingReadingIdentityKey(parseUnitAs(reading, "Reading"));
}
