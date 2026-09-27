import type * as Dumling from "dumling/types";
import { germanPluralPattern } from "dumrel";
import type * as Dumrel from "dumrel/types";

/**
 * The Plural Pattern one German noun occurrence attests (#597): its plural
 * Surface against the Lemma's Canonical Form. A dative plural adds its own
 * `-n` (`Kindern`), so only a Nom, Acc or Gen plural attests the pattern.
 */
export function attestedPluralPattern(
	surface: Dumling.Surface<"de">,
): Dumrel.PluralPattern | null {
	const features: { number?: unknown; case?: unknown } =
		Object(surface).inflectionalFeatures ?? {};
	return surface.lemma.kind === "NOUN" &&
		features.number === "Plur" &&
		features.case !== "Dat"
		? germanPluralPattern(
				surface.lemma.canonicalForm,
				surface.normalizedSurface,
			)
		: null;
}

/**
 * The attested pattern a Reading's stored plural lacks. A stored NoPlural or
 * PluralOnly takes no attested pattern: a plural-only noun attests its own
 * Canonical Form, and replacing a marker is a correction, not accumulation.
 */
export function uncoveredPluralPattern(
	attested: Dumrel.PluralPattern | null,
	knowledge: unknown,
): Dumrel.PluralPattern | null {
	const stored: unknown = Object(knowledge).pluralPattern;
	return !attested ||
		typeof stored === "string" ||
		(Array.isArray(stored) && stored.includes(attested))
		? null
		: attested;
}
