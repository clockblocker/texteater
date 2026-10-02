import { lemmaIdentityKey, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";

declare const surfaceIdBrand: unique symbol;
export type SurfaceId<L extends Dumling.Language = Dumling.Language> =
	string & {
		readonly [surfaceIdBrand]: "Surface";
		readonly language?: L;
	};

function stableValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(stableValue);
	if (value !== null && typeof value === "object")
		return Object.fromEntries(
			Object.entries(value)
				.filter(([, child]) => child !== undefined)
				.sort(([left], [right]) =>
					left < right ? -1 : left > right ? 1 : 0,
				)
				.map(([name, child]) => [name, stableValue(child)]),
		);
	return value;
}

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
	const parsed = result.chain.value as Dumling.Surface;
	return JSON.stringify(
		stableValue({ ...parsed, lemma: lemmaIdentityKey(parsed.lemma) }),
	) as SurfaceId<L>;
}
