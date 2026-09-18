import type { Encounter } from "dumgen/types";
import { validateEncounter } from "dumgen/validation";
import type * as Dumling from "dumling/types";
import { parseGermanAttestation } from "./operationalParsing";

/** Durable grammar checkpoint retains the exact Encounter used for generation. */
export type ResolvedGrammar = {
	readonly decision: "Resolved";
	readonly language: "de";
	readonly encounter: Encounter<"de">;
	readonly attestation: Dumling.Attestation<"de">;
};
export type CatalogMissSignal = {
	readonly decision: "CatalogMiss";
	readonly stage: string;
	readonly route: string;
	readonly message: string;
};
export function parseResolvedGrammar(input: {
	encounter: unknown;
	attestation: unknown;
}): ResolvedGrammar {
	const encounter = validateEncounter(input.encounter);
	if (encounter.sentence.language !== "de")
		throw new Error("Expected a German Encounter.");
	const attestation = parseGermanAttestation(input.attestation);
	if (
		attestation.surface.lemma.family !== encounter.target.family ||
		attestation.surface.lemma.kind !== encounter.target.kind ||
		attestation.members.length !==
			encounter.target.memberSegmentIndices.length ||
		attestation.members.some((member, index) => {
			const segmentIndex = encounter.target.memberSegmentIndices[index];
			return (
				segmentIndex === undefined ||
				member.attested !==
					encounter.sentence.segments[segmentIndex]?.text
			);
		})
	)
		throw new Error("Grammar checkpoint does not match its Encounter.");
	return {
		decision: "Resolved",
		language: "de",
		encounter: encounter as Encounter<"de">,
		attestation,
	};
}

/** Resumes stored pre-cutover work without reclassifying or changing occurrence membership. */
export function restoreStoredGrammar(input: {
	encounter: unknown;
	attestation: unknown;
}): ResolvedGrammar | undefined {
	try {
		const attestation = input.attestation as Record<string, unknown>;
		const surface = attestation.surface as Record<string, unknown>;
		const lemma = surface.lemma as { language: string; kind: string };
		const { articleReference: _legacy, ...currentSurface } = surface;
		const verbal =
			lemma.language === "de" &&
			["VERB", "AUX", "Idiom", "Collocation"].includes(lemma.kind);
		const bag = currentSurface.inflectionalFeatures;
		if (verbal && bag && typeof bag === "object")
			currentSurface.inflectionalFeatures = { expletive: null, ...bag };
		return parseResolvedGrammar({
			encounter: input.encounter,
			attestation: {
				...attestation,
				surface: currentSurface,
				...(verbal
					? {
							expletiveEvidence:
								attestation.expletiveEvidence ?? null,
						}
					: {}),
			},
		});
	} catch {
		return undefined;
	}
}
