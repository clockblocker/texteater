import { expect, test } from "bun:test";
import {
	parseResolvedGrammar,
	restoreStoredGrammar,
} from "../server/resolutionGrammar";

const surface = {
	unitKind: "Surface",
	language: "de",
	normalizedSurface: "regnet",
	spelling: "Canonical",
	surfaceFeatures: null,
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "regnen",
		coreFeatures: {
			hasSepPrefix: null,
			lexicallyReflexive: null,
			verbType: null,
		},
	},
	inflectionalFeatures: {
		verbForm: "Fin",
		tense: "Pres",
		mood: "Ind",
		person: "3",
		number: "Sing",
		perfect: null,
		future: null,
		passive: null,
		voice: null,
	},
};
const checkpoint = {
	encounter: {
		sentence: {
			id: "old",
			language: "de",
			segments: [
				{ kind: "ResolvableText", text: "Es" },
				{ kind: "ResolvableText", text: "regnet" },
			],
		},
		target: { family: "Lexeme", kind: "VERB", memberSegmentIndices: [1] },
	},
	attestation: {
		unitKind: "Attestation",
		surface,
		members: [{ attested: "regnet", orthography: "Standard" }],
		realizationCoverage: "Full",
	},
};
test("legacy verbal checkpoints default absent composition without absorbing adjacent es", () => {
	expect(() => parseResolvedGrammar(checkpoint)).toThrow();
	const restored = restoreStoredGrammar(checkpoint);
	expect(restored?.encounter).toEqual(checkpoint.encounter);
	expect(restored?.attestation.members).toEqual(
		checkpoint.attestation.members,
	);
	expect(restored?.attestation).toHaveProperty("expletiveEvidence", null);
	expect(restored?.attestation).toHaveProperty("valencyEvidence", []);
	expect(restored?.attestation.surface).toHaveProperty(
		"inflectionalFeatures.expletive",
		null,
	);
	expect(restored && restoreStoredGrammar(restored)).toEqual(restored);
});
test("legacy noun checkpoints discard component references but retain exact occurrence evidence", () => {
	const noun = {
		encounter: {
			sentence: {
				id: "noun-old",
				language: "de",
				segments: [
					{ kind: "ResolvableText", text: "Der" },
					{ kind: "ResolvableText", text: "Hund" },
				],
			},
			target: {
				family: "Lexeme",
				kind: "NOUN",
				memberSegmentIndices: [0, 1],
			},
		},
		attestation: {
			unitKind: "Attestation",
			surface: {
				...surface,
				normalizedSurface: "Hund",
				lemma: {
					unitKind: "Lemma",
					language: "de",
					family: "Lexeme",
					kind: "NOUN",
					canonicalForm: "Hund",
					coreFeatures: { gender: "Masc", hyph: null },
				},
				inflectionalFeatures: {
					article: "Definite",
					case: "Nom",
					number: "Sing",
				},
				articleReference: { obsolete: true },
			},
			members: [
				{ attested: "Der", orthography: "Standard" },
				{ attested: "Hund", orthography: "Standard" },
			],
			realizationCoverage: "Full",
			articleEvidence: { kind: "Owned", member: 0 },
			valencyEvidence: [],
		},
	};
	expect(() => parseResolvedGrammar(noun)).toThrow();
	const restored = restoreStoredGrammar(noun);
	expect(restored?.attestation.surface).not.toHaveProperty(
		"articleReference",
	);
	expect(restored?.attestation).toHaveProperty(
		"articleEvidence",
		noun.attestation.articleEvidence,
	);
	expect(restored?.encounter).toEqual(noun.encounter);
	expect(
		restoreStoredGrammar({ ...noun, attestation: null }),
	).toBeUndefined();
});
