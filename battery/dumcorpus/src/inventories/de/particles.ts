import type { AuthoredMember } from "../member.js";
import { member as infinitiveZu } from "./members/lexeme/particle/infinitive-zu.js";
import { member as softeningMal } from "./members/lexeme/particle/mal.js";
import { modalParticles } from "./members/lexeme/particle/modal-particles.js";
import { member as negationNicht } from "./members/lexeme/particle/nicht.js";

/**
 * Every German PART, all authored (#734): nicht (polarity Neg), infinitive zu
 * (partType Inf) and the modal particles (partType Mod), one member per
 * Reading. German PART is closed, so a PART no member here is fails dumcorpus's
 * closed-PART check.
 */
export const germanParticles: readonly AuthoredMember[] = [
	negationNicht,
	infinitiveZu,
	softeningMal,
	...modalParticles,
];

const coreKeys = ["partType", "polarity"] as const;

/**
 * The first authored PART member whose Lemma has `lemma`'s Canonical Form,
 * compared without letter case, and its Core Features.
 */
export function germanParticleMember(lemma: {
	readonly canonicalForm: string;
	readonly coreFeatures: Readonly<Record<string, unknown>>;
}): AuthoredMember | undefined {
	const form = lemma.canonicalForm.toLocaleLowerCase("de");
	const core = lemma.coreFeatures;
	return germanParticles.find((member) => {
		const authored: Readonly<Record<string, unknown>> =
			member.lemma.coreFeatures;
		return (
			member.lemma.canonicalForm.toLocaleLowerCase("de") === form &&
			coreKeys.every(
				(key) => (authored[key] ?? null) === (core[key] ?? null),
			)
		);
	});
}
