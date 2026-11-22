import type * as Dumling from "dumling/types";

/**
 * The inflectional feature bag of a Surface, or null when the route marks no
 * inflection or leaves the bag null.
 */
export function inflectionalBagOf(
	surface: Dumling.Surface,
): Readonly<Record<string, unknown>> | null {
	return "inflectionalFeatures" in surface
		? surface.inflectionalFeatures
		: null;
}
