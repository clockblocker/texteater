import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { unitFingerprint } from "./core/identity.js";

declare const surfaceIdBrand: unique symbol;
export type SurfaceId<L extends Dumling.Language = Dumling.Language> =
	string & {
		readonly [surfaceIdBrand]: "Surface";
		readonly language?: L;
	};

/** Derives a Surface identity inside the caller's dictionary scope. */
export function makeSurfaceId<L extends Dumling.Language>(
	language: L,
	surface: Dumling.Surface<L>,
): SurfaceId<L> {
	const result = parseUnit(surface);
	if (!result.success) throw result.error;
	if (result.chain.language !== language)
		throw new Error("Unit language does not match the dictionary");
	return unitFingerprint(result.chain.value) as SurfaceId<L>;
}
export function makeLemmaId<L extends Dumling.Language>(
	language: L,
	lemma: Dumling.Lemma<L>,
): string {
	const result = parseUnit(lemma);
	if (!result.success) throw result.error;
	if (result.chain.language !== language)
		throw new Error("Unit language does not match the dictionary");
	return unitFingerprint(result.chain.value);
}
