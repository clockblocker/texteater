import type * as Dumling from "dumling/types";
import {
	germanGovernorKinds,
	germanVerbalKinds,
} from "../shared/german-evidence-kinds";
import { type ClickEncounter, validateClickEncounter } from "./clickEncounter";
import { parseGermanAttestation } from "./operationalParsing";

/** Durable grammar checkpoint retains the exact Encounter used for generation. */
export type ResolvedGrammar = {
	readonly decision: "Resolved";
	readonly language: "de";
	readonly encounter: ClickEncounter;
	readonly attestation: Dumling.Attestation<"de">;
	/**
	 * The Emoji Description Luna drafted with the Canonical Form, for the
	 * Reading. The checkpoint keeps no draft: a resumed click has Luna write
	 * the description when it needs one.
	 */
	readonly drafted?: string;
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
	const encounter = validateClickEncounter(input.encounter);
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
		encounter,
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
			lemma.language === "de" && germanVerbalKinds.includes(lemma.kind);
		const governor =
			lemma.language === "de" && germanGovernorKinds.includes(lemma.kind);
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
				...(governor ||
				(lemma.language === "de" && lemma.kind === "ADP")
					? { valencyEvidence: attestation.valencyEvidence ?? [] }
					: {}),
			},
		});
	} catch {
		return undefined;
	}
}
