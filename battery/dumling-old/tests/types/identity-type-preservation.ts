import type { Equal, Expect } from "common-utils";
import type { AttestationMember } from "../../src/types/internal-types.js";
import type { Attestation, Lemma } from "../../src/types.js";

type DeNounLemma = Extract<Lemma<"de">, { family: "Lexeme"; kind: "NOUN" }>;
type _LemmaIsStructural = Expect<
	Equal<
		keyof DeNounLemma,
		"language" | "canonicalForm" | "family" | "kind" | "coreFeatures"
	>
>;

type DeAttestation = Attestation<"de">;
type _AttestationHasOnlyOccurrenceEvidenceAndSurface = Expect<
	Equal<keyof DeAttestation, "members" | "realizationCoverage" | "surface">
>;
type _MembersArePairedEvidence = Expect<
	Equal<DeAttestation["members"][number], AttestationMember>
>;
