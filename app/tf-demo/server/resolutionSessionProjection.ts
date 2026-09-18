import { checkIfGrundform } from "dumling";
import type * as Dumling from "dumling/types";
export type ResolutionGrammarProjection = {
	readonly members: {
		readonly attested: string;
		readonly orthography: "Standard" | "Typo";
	}[];
	readonly realizationCoverage: "Full" | "Partial";
	readonly normalizedSurface: string;
	readonly spelling: "Canonical" | "Variant";
	readonly grundform: boolean | null;
	readonly canonicalForm: string;
	readonly family: string;
	readonly kind: string;
	readonly coreFeatures?: Readonly<Record<string, unknown>>;
};

export type ResolutionReadingProjection = {
	readonly emojiDescription: string;
	readonly canonicalForm: string;
	readonly family: string;
	readonly kind: string;
};

type ResolvedGrammaticalProjectionInput = {
	readonly attestation: Dumling.Attestation;
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
	const assessment = checkIfGrundform(surface);
	return {
		members: grammatical.attestation.members.map((member) => ({
			attested: member.attested,
			orthography: member.orthography,
		})),
		realizationCoverage: grammatical.attestation.realizationCoverage,
		normalizedSurface: surface.normalizedSurface,
		spelling: surface.spelling,
		grundform: assessment.success ? assessment.value : null,
		canonicalForm: surface.lemma.canonicalForm,
		family: surface.lemma.family,
		kind: surface.lemma.kind,
		coreFeatures: surface.lemma.coreFeatures,
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
