import type { Surface, SurfaceKind } from "./types.js";

/**
 * Defaults to Inflection when a feature is marked, otherwise Citation.
 * Pass an explicit assessment to override this heuristic without changing the
 * Surface type or introducing a Citation/Inflection union.
 */
export function assessSurfaceKind(
	surface: Surface,
	override?: SurfaceKind,
): SurfaceKind {
	return (
		override ??
		("inflectionalFeatures" in surface &&
		surface.inflectionalFeatures !== null &&
		Object.values(surface.inflectionalFeatures).some(
			(value) => value !== null,
		)
			? "Inflection"
			: "Citation")
	);
}
