import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import type { ClickEncounter } from "../server/clickEncounter";
import {
	parseResolvedGrammar,
	restoreStoredGrammar,
} from "../server/resolutionGrammar";

const surface = {
	unitKind: "Surface",
	language: "de",
	normalizedSurface: "regnet",
	spelling: { kind: "Canonical" },
	surfaceFeatures: null,
	lemma: {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "regnen",
		coreFeatures: {
			hasSepPrefix: null,
		},
	},
	inflectionalFeatures: {
		expletive: null,
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
			id: "regnet",
			language: "de",
			segments: [
				{ kind: "ResolvableText", text: "Es" },
				{ kind: "ResolvableText", text: "regnet" },
			],
		},
		target: { family: "Lexeme", kind: "VERB", memberSegmentIndices: [1] },
	} satisfies ClickEncounter,
	attestation: {
		unitKind: "Attestation",
		surface,
		members: [
			{ attested: "regnet", orthography: "Standard" },
		] satisfies Dumling.Attestation<"de">["members"],
		realizationCoverage: "Full",
		expletiveEvidence: null,
		valencyEvidence: [],
	},
};
test("a stored checkpoint restores as it was stored", () => {
	expect(restoreStoredGrammar(checkpoint)).toEqual({
		ok: true,
		grammar: parseResolvedGrammar(checkpoint),
	});
});
test("a checkpoint whose attestation is not an object fails with a reason instead of throwing", () => {
	for (const attestation of [
		null,
		{ ...checkpoint.attestation, surface: null },
	])
		expect(
			restoreStoredGrammar({ ...checkpoint, attestation }),
		).toMatchObject({ ok: false, reason: expect.any(String) });
});
test("a checkpoint that no longer matches its Encounter fails with the parser's reason", () => {
	expect(
		restoreStoredGrammar({
			...checkpoint,
			encounter: {
				...checkpoint.encounter,
				target: { ...checkpoint.encounter.target, kind: "AUX" },
			},
		}),
	).toEqual({
		ok: false,
		reason: "Grammar checkpoint does not match its Encounter.",
	});
});
