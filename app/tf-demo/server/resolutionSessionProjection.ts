import { checkIfGrundform } from "dumcorpus/inventories";
import type * as Dumling from "dumling/types";
import { attestationValencyMembers } from "./attestationValencyMembers";

/** A Surface's spelling: Canonical, or a Variant with its tags (ADR 0041). */
type SurfaceSpelling =
	| { kind: "Canonical" }
	| {
			kind: "Variant";
			variantTags: [Dumling.VariantTag, ...Dumling.VariantTag[]];
	  };

/**
 * One member as the Session shows it: a `Fused` piece keeps its Fusion and
 * component, so the pending Attestation can say what the fused word stands
 * for (ADR 0035).
 */
type ResolutionMember =
	| {
			attested: string;
			orthography: "Standard" | "Typo" | "Shorthand";
	  }
	| {
			attested: string;
			orthography: "Fused";
			fusion: {
				spelling: string;
				components: { span: string; surface: string }[];
			};
			component: number;
	  };

/**
 * What a Resolution Session shows of its resolved German Lemma, one branch per
 * Kind so Family, Kind and Core Features stay correlated.
 */
export type ResolutionGrammarProjection<
	Lemma extends Dumling.Lemma<"de"> = Dumling.Lemma<"de">,
> = Lemma extends unknown
	? {
			grundform: boolean | null;
			members: ResolutionMember[];
			/** Members realizing a valency marker, such as a governed preposition. */
			valencyMembers: number[];
			realizationCoverage: "Full" | "Partial";
			normalizedSurface: string;
			spelling: SurfaceSpelling;
			canonicalForm: string;
			family: Lemma["family"];
			kind: Lemma["kind"];
			coreFeatures: Lemma["coreFeatures"];
		}
	: never;

export type ResolutionReadingProjection<
	Lemma extends Dumling.Lemma<"de"> = Dumling.Lemma<"de">,
> = Lemma extends { family: "Foreign" }
	? {
			/** A Foreign Reading has no Emoji Description (ADR 0045). */
			emojiDescription?: undefined;
			canonicalForm: string;
			family: Lemma["family"];
			kind: Lemma["kind"];
		}
	: {
			emojiDescription: string;
			canonicalForm: string;
			family: Lemma["family"];
			kind: Lemma["kind"];
		};

type ResolvedGrammaticalProjectionInput = {
	readonly attestation: Dumling.Attestation<"de">;
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
		members: grammatical.attestation.members.map(
			(member): ResolutionMember =>
				member.orthography === "Fused"
					? {
							attested: member.attested,
							orthography: member.orthography,
							fusion: {
								spelling: member.fusion.spelling,
								components: member.fusion.components.map(
									({ span, surface }) => ({ span, surface }),
								),
							},
							component: member.component,
						}
					: {
							attested: member.attested,
							orthography: member.orthography,
						},
		),
		valencyMembers: attestationValencyMembers(grammatical.attestation),
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
	reading: Dumling.Reading<"de">,
): ResolutionReadingProjection {
	return {
		...("emojiDescription" in reading
			? { emojiDescription: reading.emojiDescription }
			: {}),
		canonicalForm: reading.lemma.canonicalForm,
		family: reading.lemma.family,
		kind: reading.lemma.kind,
	} as ResolutionReadingProjection;
}
