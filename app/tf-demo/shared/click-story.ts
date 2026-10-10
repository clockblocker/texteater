/**
 * Which Cards of a click's Deck say something about how the clicked text led
 * to its Reading (#1164). A Card whose step says nothing is not dealt; the
 * Reading always is. The Deck and each Card's caption read the same rules,
 * so a caption names the Card that is actually dealt in front of it.
 */

/**
 * The Attestation says something when its unit is more than the clicked
 * word, or a word not in its standard spelling: a Typo, a Shorthand or a
 * piece of a fused word. A split unit has more than one member.
 */
export function attestationSaysSomething(
	members: readonly { readonly orthography: string }[],
): boolean {
	return (
		members.length > 1 ||
		members.some(({ orthography }) => orthography !== "Standard")
	);
}

/**
 * What a click knows before Grammar has read it: a stored unit of more than
 * one Segment makes the Attestation say something.
 */
export function unitSaysSomething(
	unitSegments: readonly number[] | undefined,
): boolean {
	return (unitSegments?.length ?? 0) > 1;
}

/**
 * The Surface says something unless it is its Lemma's Grundform in the
 * standard spelling. Grundform is the stored assessment, never a comparison
 * of strings: dative `Wald` is spelled like `Wald` and still says `dative`.
 * An assessment that could not be made (null) says something.
 */
export function surfaceSaysSomething(surface: {
	readonly grundform: boolean | null;
	readonly spelling: { readonly kind: string };
}): boolean {
	return !(
		surface.grundform === true && surface.spelling.kind === "Canonical"
	);
}

/** The Lemma says something when it holds more than one stored Reading. */
export function lemmaSaysSomething(readingCount: number): boolean {
	return readingCount > 1;
}
