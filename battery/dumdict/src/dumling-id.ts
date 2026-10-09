import { canonicalJson } from "common-utils";
import { lemmaIdentityKey, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";

declare const surfaceIdBrand: unique symbol;
export type SurfaceId<L extends Dumling.Language = Dumling.Language> =
	string & {
		readonly [surfaceIdBrand]: "Surface";
		readonly language?: L;
	};

/**
 * Derives a Surface identity inside the caller's dictionary scope. The
 * Surface's own `normalizedSurface` keeps its exact casing, and its Lemma
 * counts by Dumling's case-folded identity key (system ADR 0002).
 */
export function makeSurfaceId<L extends Dumling.Language>(
	language: L,
	surface: Dumling.Surface<L>,
): SurfaceId<L> {
	const result = parseUnit(surface);
	if (!result.success) throw result.error;
	if (result.chain.language !== language)
		throw new Error("Unit language does not match the dictionary");
	const parsed = result.chain.value;
	// The brand is type-only, so the ID is minted here from the parsed Surface.
	return canonicalJson({
		...parsed,
		lemma: lemmaIdentityKey(parsed.lemma),
	}) as SurfaceId<L>;
}
