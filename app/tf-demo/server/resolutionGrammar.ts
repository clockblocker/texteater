import { messageOf } from "common-utils";
import type * as Dumling from "dumling/types";
import { type ClickEncounter, validateClickEncounter } from "./clickEncounter";
import { parseAttestation } from "./operationalParsing";

/** Durable grammar checkpoint retains the exact Encounter used for generation. */
export type ResolvedGrammar = {
	readonly decision: "Resolved";
	readonly language: ClickEncounter["sentence"]["language"];
	readonly encounter: ClickEncounter;
	readonly attestation: Dumling.Attestation<Dumling.Language>;
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
	const attestation = parseAttestation(
		input.attestation,
		encounter.sentence.language,
	);
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
		language: encounter.sentence.language,
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

/** Restores a stored Grammar checkpoint, or names why it no longer parses. */
export function restoreStoredGrammar(input: {
	encounter: unknown;
	attestation: unknown;
}): StoredGrammarRestore {
	try {
		return { ok: true, grammar: parseResolvedGrammar(input) };
	} catch (error) {
		return { ok: false, reason: messageOf(error) };
	}
}
