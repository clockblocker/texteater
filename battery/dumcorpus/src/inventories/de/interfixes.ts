/**
 * The German Interfixes, the closed set of linking elements (Fugenelemente)
 * a compound's Constituents may link to (system ADR 0050): `Arbeit + -s- +
 * Amt`, `[[Gast|Gäst]] + [[-e-|e]] + [[Haus|haus]]`, `Kind + -er- + Garten`.
 * Each is spelled as a Morpheme Lemma's Canonical Form, hyphens on both
 * sides.
 */
export const germanInterfixes: ReadonlySet<string> = new Set([
	"-e-",
	"-en-",
	"-ens-",
	"-er-",
	"-es-",
	"-n-",
	"-s-",
]);
