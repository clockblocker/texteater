import type { Attestation, AttestationMember, Lemma } from "../../src/types.js";

type Assert<T extends true> = T;
type Equal<Left, Right> =
	(<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
		? true
		: false;

type DeNounLemma = Extract<Lemma<"de">, { family: "Lexeme"; kind: "NOUN" }>;
type _LemmaIsStructural = Assert<
	Equal<
		keyof DeNounLemma,
		"language" | "canonicalForm" | "family" | "kind" | "coreFeatures"
	>
>;

type DeAttestation = Attestation<"de">;
type _AttestationHasOnlyOccurrenceEvidenceAndSurface = Assert<
	Equal<keyof DeAttestation, "members" | "realizationCoverage" | "surface">
>;
type _MembersArePairedEvidence = Assert<
	Equal<DeAttestation["members"][number], AttestationMember>
>;
