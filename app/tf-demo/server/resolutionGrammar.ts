import { isRecord, messageOf } from "common-utils";
import type * as Dumling from "dumling/types";
import { type ClickEncounter, validateClickEncounter } from "./clickEncounter";
import { germanGovernorKinds, germanVerbalKinds } from "./germanEvidenceKinds";
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

/**
 * The outcome of restoring a stored Grammar checkpoint. A failure names why
 * the checkpoint no longer parses, so the caller can report it and resume
 * without it.
 */
export type StoredGrammarRestore =
	| { readonly ok: true; readonly grammar: ResolvedGrammar }
	| { readonly ok: false; readonly reason: string };

function restoreFailure(reason: string): StoredGrammarRestore {
	return { ok: false, reason };
}

/** Resumes stored pre-cutover work without reclassifying or changing occurrence membership. */
export function restoreStoredGrammar(input: {
	encounter: unknown;
	attestation: unknown;
}): StoredGrammarRestore {
	const { attestation } = input;
	if (!isRecord(attestation))
		return restoreFailure(
			"Grammar checkpoint attestation must be an object.",
		);
	const { surface } = attestation;
	if (!isRecord(surface))
		return restoreFailure("Grammar checkpoint surface must be an object.");
	const { lemma } = surface;
	if (!isRecord(lemma))
		return restoreFailure("Grammar checkpoint lemma must be an object.");
	const { articleReference: _legacy, ...currentSurface } = surface;
	const germanKind =
		lemma.language === "de" && typeof lemma.kind === "string"
			? lemma.kind
			: undefined;
	const verbal =
		germanKind !== undefined && germanVerbalKinds.includes(germanKind);
	const governor =
		germanKind !== undefined && germanGovernorKinds.includes(germanKind);
	const bag = currentSurface.inflectionalFeatures;
	if (verbal && isRecord(bag))
		currentSurface.inflectionalFeatures = { expletive: null, ...bag };
	try {
		return {
			ok: true,
			grammar: parseResolvedGrammar({
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
					...(governor || germanKind === "ADP"
						? { valencyEvidence: attestation.valencyEvidence ?? [] }
						: {}),
				},
			}),
		};
	} catch (error) {
		return restoreFailure(messageOf(error));
	}
}
