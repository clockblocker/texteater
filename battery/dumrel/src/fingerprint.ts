import { foldCase } from "dumling";
import type * as Dumling from "dumling/types";

/**
 * Structural equality key: equal values give equal keys whatever their key
 * order. A Canonical Form counts case-folded, as Lemma identity does (system
 * ADR 0002): a Lemma, Reading or Unit Shadow spelled `LOL` and one spelled
 * `lol` give one key.
 */
export function fingerprint(value: unknown): string {
	return JSON.stringify(sort(value));
}

function sort(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sort);
	if (value !== null && typeof value === "object")
		return Object.fromEntries(
			Object.entries(foldCanonicalForm(value))
				.toSorted(([left], [right]) => left.localeCompare(right))
				.map(([key, child]) => [key, sort(child)]),
		);
	return value;
}

/**
 * A Lemma or Unit Shadow with its Canonical Form case-folded by Dumling for
 * identity (system ADR 0002). Any other object is returned as it is.
 */
export function foldCanonicalForm(value: object): object {
	const { canonicalForm, language } = value as {
		canonicalForm?: unknown;
		language?: unknown;
	};
	return typeof canonicalForm === "string" && typeof language === "string"
		? {
				...value,
				canonicalForm: foldCase(
					canonicalForm,
					language as Dumling.Language,
				),
			}
		: value;
}
