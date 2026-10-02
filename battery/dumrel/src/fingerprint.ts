import { foldCase } from "dumling";
import type * as Dumling from "dumling/types";

/**
 * Structural equality keys: equal values give equal keys whatever their key
 * order, and a member holding `undefined` counts as absent. A Canonical Form
 * counts case-folded, as Lemma identity does (system ADR 0002): a Lemma,
 * Reading or Unit Shadow spelled `LOL` and one spelled `lol` give one key.
 * Keys index values inside one operation and are not a persistent ID codec.
 * Each returned function caches keys by object identity, so keep it only
 * while the values it has keyed stay unmutated.
 */
export function structuralKeys(): (value: unknown) => string {
	const cache = new WeakMap<object, string>();
	function key(value: unknown): string {
		if (value === null || typeof value !== "object")
			return JSON.stringify(value);
		const known = cache.get(value);
		if (known !== undefined) return known;
		const computed = Array.isArray(value)
			? `[${value.map(key).join(",")}]`
			: `{${Object.entries(foldCanonicalForm(value))
					.filter(([, member]) => member !== undefined)
					.sort(([left], [right]) => compare(left, right))
					.map(
						([name, member]) =>
							`${JSON.stringify(name)}:${key(member)}`,
					)
					.join(",")}}`;
		cache.set(value, computed);
		return computed;
	}
	return key;
}

/** Code-point order, the same in every runtime, unlike `localeCompare`. */
export function compare(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * A Lemma or Unit Shadow with its Canonical Form case-folded by Dumling for
 * identity (system ADR 0002). Any other object is returned as it is.
 */
function foldCanonicalForm(value: object): object {
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
