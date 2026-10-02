import type { Infer } from "convex/values";
import type { SentenceAnalysis, Slot } from "legacy-dumgen/types";
import type { storedSentenceAnalysisValidator } from "../convex/model/validators";

export type StoredSentenceAnalysis = Infer<
	typeof storedSentenceAnalysisValidator
>;

type StoredMass = StoredSentenceAnalysis["targets"][number]["routeMass"];

/**
 * Dumgen keeps masses as records keyed by Kind or identity key; Convex record
 * keys must be ASCII and identity keys carry headwords such as `für`, so the
 * stored form is a list of pairs. Both directions are lossless.
 */
function toStoredMass(mass: Readonly<Record<string, number>>): StoredMass {
	return Object.entries(mass).map(([key, share]) => ({ key, share }));
}

function fromStoredMass(mass: StoredMass): Record<string, number> {
	return Object.fromEntries(mass.map(({ key, share }) => [key, share]));
}

/**
 * A stored slot's complement names its case `governedCase`, as Attestation
 * evidence does (ADR 0034). Dumgen's legacy intake still names it `case`, so
 * both directions rename it.
 */
export function toStoredSentenceAnalysis(
	analysis: SentenceAnalysis,
): StoredSentenceAnalysis {
	return {
		sentenceId: analysis.sentenceId,
		language: analysis.language,
		stitchedText: analysis.stitchedText,
		segments: analysis.segments.map((segment) => ({ ...segment })),
		targets: analysis.targets.map((target) => ({
			id: target.id,
			members: target.members.map((member) => ({ ...member })),
			routeMass: toStoredMass(target.routeMass),
			identity: target.identity
				? {
						candidates: target.identity.candidates.map(
							(candidate) => ({
								...candidate,
								cells: [...candidate.cells],
							}),
						),
						mass: toStoredMass(target.identity.mass),
					}
				: null,
			provenance: target.provenance,
		})),
		phrasemes: analysis.phrasemes.map((phraseme) => ({
			id: phraseme.id,
			members: [...phraseme.members],
			governedPrepositions: [...phraseme.governedPrepositions],
			kindMass: toStoredMass(phraseme.kindMass),
			fixedness: phraseme.fixedness,
			provenance: phraseme.provenance,
		})),
		fusions: analysis.fusions.map((fusion) => ({
			offset: fusion.offset,
			form: fusion.form,
			components: fusion.components.map((component) => ({
				...component,
			})),
		})),
		slots: analysis.slots.map(
			({
				complement: { case: governedCase, ...complement },
				...slot
			}) => ({
				...slot,
				complement: { ...complement, governedCase },
			}),
		),
	};
}

export function fromStoredSentenceAnalysis(
	stored: StoredSentenceAnalysis,
): SentenceAnalysis {
	return {
		sentenceId: stored.sentenceId,
		language: stored.language,
		stitchedText: stored.stitchedText,
		segments: stored.segments,
		targets: stored.targets.map((target) => ({
			id: target.id,
			members: target.members,
			routeMass: fromStoredMass(target.routeMass),
			identity: target.identity
				? {
						candidates: target.identity.candidates,
						mass: fromStoredMass(target.identity.mass),
					}
				: null,
			provenance: target.provenance,
		})),
		phrasemes: stored.phrasemes.map((phraseme) => ({
			id: phraseme.id,
			members: phraseme.members,
			governedPrepositions: phraseme.governedPrepositions,
			kindMass: fromStoredMass(phraseme.kindMass),
			fixedness: phraseme.fixedness,
			provenance: phraseme.provenance,
		})),
		fusions: stored.fusions,
		slots: stored.slots.map(
			({
				complement: { governedCase, preposition, ...complement },
				...slot
			}) => ({
				...slot,
				complement: {
					...complement,
					preposition:
						preposition as Slot["complement"]["preposition"],
					case: governedCase,
				},
			}),
		),
	};
}
