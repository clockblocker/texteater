import type * as Dumling from "dumling/types";
import { germanParticleMember } from "../inventories/de/particles.js";

/** A German PART no authored member is, at a path inside the checked Attestation. */
export type ParticleIssue = {
	readonly path: string;
	readonly message: string;
};

/**
 * German PART is closed (#734): nicht, infinitive zu and the modal particles
 * are authored, so a German Lexeme PART must match an authored member by
 * Canonical Form and Core Features (Rule de/modal-particle-is-part). Any
 * other PART is a miss, not drift.
 */
export function attestationParticleIssues(
	attestation: Dumling.Attestation<"de">,
): ParticleIssue[] {
	const { lemma } = attestation.surface;
	if (lemma.family !== "Lexeme" || lemma.kind !== "PART") return [];
	if (germanParticleMember(lemma)) return [];
	return [
		{
			path: "surface.lemma",
			message: `No authored German PART is ${lemma.canonicalForm} ${JSON.stringify(lemma.coreFeatures)}; German PART is nicht, infinitive zu and the authored modal particles (de/modal-particle-is-part)`,
		},
	];
}
