import { checkIfGrundform } from "dumling";
import type * as Dumling from "dumling/types";
/**
 * What a Resolution Session shows of its resolved German Lemma, one branch per
 * Kind so Family, Kind and Core Features stay correlated.
 */
export type ResolutionGrammarProjection<
	Lemma extends Dumling.Lemma<"de"> = Dumling.Lemma<"de">,
> = Lemma extends unknown
	? {
			grundform: boolean | null;
			members: { attested: string; orthography: "Standard" | "Typo" }[];
			realizationCoverage: "Full" | "Partial";
			normalizedSurface: string;
			spelling: "Canonical" | "Variant";
			canonicalForm: string;
			family: Lemma["family"];
			kind: Lemma["kind"];
			coreFeatures: Lemma["coreFeatures"];
		}
	: never;

export type ResolutionReadingProjection<
	Lemma extends Dumling.Lemma<"de"> = Dumling.Lemma<"de">,
> = Lemma extends unknown
	? {
			emojiDescription: string;
			canonicalForm: string;
			family: Lemma["family"];
			kind: Lemma["kind"];
		}
	: never;

type ResolvedGrammaticalProjectionInput = {
	readonly attestation: Dumling.Attestation<"de">;
};

type ReadingProjectionInput = {
	readonly emojiDescription: string;
	readonly lemma: Dumling.Lemma<"de">;
};

export function projectResolutionGrammar(
	grammatical: ResolvedGrammaticalProjectionInput,
): ResolutionGrammarProjection {
	const surface = grammatical.attestation.surface;
	const assessment = checkIfGrundform(surface);
	// Family, Kind and Core Features all come from the same Lemma, which
	// TypeScript cannot follow through a union value.
	return {
		grundform: assessment.success ? assessment.value : null,
		members: grammatical.attestation.members.map((member) => ({
			attested: member.attested,
			orthography: member.orthography,
		})),
		realizationCoverage: grammatical.attestation.realizationCoverage,
		normalizedSurface: surface.normalizedSurface,
		spelling: surface.spelling,
		canonicalForm: surface.lemma.canonicalForm,
		family: surface.lemma.family,
		kind: surface.lemma.kind,
		coreFeatures: surface.lemma.coreFeatures,
	} as ResolutionGrammarProjection;
}

export function projectResolutionReading(
	reading: ReadingProjectionInput,
): ResolutionReadingProjection {
	return {
		emojiDescription: reading.emojiDescription,
		canonicalForm: reading.lemma.canonicalForm,
		family: reading.lemma.family,
		kind: reading.lemma.kind,
	} as ResolutionReadingProjection;
}
