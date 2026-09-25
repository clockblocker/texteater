/** German Kinds whose Attestation names its subject-expletive member (ADR 0022). */
export const germanVerbalKinds: readonly string[] = [
	"VERB",
	"AUX",
	"Idiom",
	"Collocation",
];

/**
 * German Kinds whose Attestation names the valency slots it realizes, such as
 * its governed preposition member: every governor Kind (ADR 0034).
 */
export const germanGovernorKinds: readonly string[] = [
	...germanVerbalKinds,
	"ADJ",
	"NOUN",
];
