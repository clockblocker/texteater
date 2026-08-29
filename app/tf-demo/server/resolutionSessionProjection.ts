export type ResolutionGrammarProjection = {
	readonly members: {
		readonly attested: string;
		readonly orthography: "Standard" | "Typo";
	}[];
	readonly realizationCoverage: "Full" | "Partial";
	readonly normalizedSurface: string;
	readonly spelling: "Canonical" | "Variant";
	readonly surfaceKind: "Citation" | "Inflection";
	readonly canonicalForm: string;
	readonly family: string;
	readonly kind: string;
};

export type ResolutionReadingProjection = {
	readonly emojiDescription: string;
	readonly canonicalForm: string;
	readonly family: string;
	readonly kind: string;
};

type ResolvedGrammaticalProjectionInput = {
	readonly attestation: {
		readonly members: readonly {
			readonly attested: string;
			readonly orthography: "Standard" | "Typo";
		}[];
		readonly realizationCoverage: "Full" | "Partial";
		readonly surface: {
			readonly normalizedSurface: string;
			readonly spelling: "Canonical" | "Variant";
			readonly surfaceKind: "Citation" | "Inflection";
			readonly lemma: {
				readonly canonicalForm: string;
				readonly family: string;
				readonly kind: string;
			};
		};
	};
};

type ReadingProjectionInput = {
	readonly emojiDescription: string;
	readonly lemma: {
		readonly canonicalForm: string;
		readonly family: string;
		readonly kind: string;
	};
};

export function projectResolutionGrammar(
	grammatical: ResolvedGrammaticalProjectionInput,
): ResolutionGrammarProjection {
	const surface = grammatical.attestation.surface;
	return {
		members: grammatical.attestation.members.map((member) => ({
			attested: member.attested,
			orthography: member.orthography,
		})),
		realizationCoverage: grammatical.attestation.realizationCoverage,
		normalizedSurface: surface.normalizedSurface,
		spelling: surface.spelling,
		surfaceKind: surface.surfaceKind,
		canonicalForm: surface.lemma.canonicalForm,
		family: surface.lemma.family,
		kind: surface.lemma.kind,
	};
}

export function projectResolutionReading(
	reading: ReadingProjectionInput,
): ResolutionReadingProjection {
	return {
		emojiDescription: reading.emojiDescription,
		canonicalForm: reading.lemma.canonicalForm,
		family: reading.lemma.family,
		kind: reading.lemma.kind,
	};
}
