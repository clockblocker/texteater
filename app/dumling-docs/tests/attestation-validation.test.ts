import { expect, test } from "bun:test";
import { dumling } from "dumling";
import { isAttestation } from "../scripts/generate-content/attestations/entity/guards";
import { validateOccurrenceAttestation } from "../scripts/generate-content/attestations/validate/validate-occurrence-attestation";
import type { AttestationSource } from "../scripts/generate-content/shared/types";

const lemma = dumling.en.create.lemma({
	canonicalForm: "walk",
	family: "Lexeme",
	kind: "VERB",
	coreFeatures: {
		abbr: null,
		extPos: null,
		hasGovPrep: null,
		phrasal: null,
		style: null,
	},
});
const surface = dumling.en.convert.lemma.toSurface(lemma);
const valid = dumling.en.create.attestation({
	members: [{ attested: "walk", orthography: "Standard" }],
	realizationCoverage: "Full",
	surface,
});

function source(entity: unknown): AttestationSource {
	return {
		entity: entity as AttestationSource["entity"],
		sentenceMarkdown: "I [walk].",
		sourcePath: "attestation.ts",
		wrappedEntityKind: "attestation",
	};
}

test("strict occurrence validation rejects removed click fields", () => {
	expect(() =>
		validateOccurrenceAttestation(
			source({ ...valid, clickedSegmentIndex: 0 }),
		),
	).toThrow();
});

test("strict occurrence validation rejects empty members", () => {
	expect(() =>
		validateOccurrenceAttestation(source({ ...valid, members: [] })),
	).toThrow();
});

test("the exported Attestation guard rejects empty attested strings", () => {
	expect(
		isAttestation({
			...valid,
			members: [{ attested: "", orthography: "Standard" }],
		}),
	).toBe(false);
});

test("wrapped Attestations cannot bypass validation by omitting members", () => {
	expect(() =>
		validateOccurrenceAttestation(source({ surface: valid.surface })),
	).toThrow();
});
