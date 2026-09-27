import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	attestationAdpositionCaseIssues,
	frameAdpositionCaseIssues,
	germanAdpositionCases,
} from "../src/index.js";

const adposition = (canonicalForm: string, adpType = "Prep") => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm,
	coreFeatures: {
		abbr: null,
		adpType,
		extPos: null,
		foreign: null,
		partType: null,
	},
});

/** A free ADP occurrence with the case its complement took, as Dumling parses it. */
function adpAttestation(
	canonicalForm: string,
	realizedCase: string,
	adpType = "Prep",
): Dumling.Attestation {
	const parsed = parseUnit({
		unitKind: "Attestation",
		members: [{ attested: canonicalForm, orthography: "Standard" }],
		realizationCoverage: "Full",
		valencyEvidence: [
			{
				member: null,
				complement: {
					kind: "Case",
					case: realizedCase,
					referent: "Either",
				},
				realizedCase,
			},
		],
		surface: {
			unitKind: "Surface",
			language: "de",
			normalizedSurface: canonicalForm,
			spelling: "Canonical",
			surfaceFeatures: null,
			lemma: adposition(canonicalForm, adpType),
		},
	});
	if (!parsed.success || parsed.chain.unitKind !== "Attestation")
		throw Error(`Dumling rejects ${canonicalForm} + ${realizedCase}`);
	return parsed.chain.value;
}

test("an ADP occurrence takes a case the ADP Case Table allows", () => {
	for (const [canonicalForm, realizedCase, adpType] of [
		["auf", "Dat", "Prep"],
		["auf", "Acc", "Prep"],
		["wegen", "Dat", "Prep"],
		["wegen", "Gen", "Prep"],
		["entlang", "Acc", "Post"],
		["entlang", "Gen", "Prep"],
		["versus", "Acc", "Prep"],
	] as const)
		expect(
			attestationAdpositionCaseIssues(
				adpAttestation(canonicalForm, realizedCase, adpType),
			),
		).toEqual([]);
});

test("a case the table does not allow passes Dumling and fails dumspec", () => {
	expect(
		attestationAdpositionCaseIssues(adpAttestation("auf", "Gen")),
	).toEqual([
		{
			path: "valencyEvidence.0.realizedCase",
			message: "auf does not take Gen",
		},
	]);
	for (const [canonicalForm, realizedCase, adpType] of [
		["für", "Dat", "Prep"],
		["mit", "Acc", "Prep"],
		["entlang", "Gen", "Post"],
		["entlang", "Acc", "Prep"],
	] as const)
		expect(
			attestationAdpositionCaseIssues(
				adpAttestation(canonicalForm, realizedCase, adpType),
			),
		).toHaveLength(1);
});

const frame = (canonicalForm: string, grammaticalCase: string) =>
	[
		{
			status: "Optional",
			complement: {
				kind: "Preposition",
				preposition: adposition(canonicalForm),
				case: grammaticalCase,
				referent: "Either",
			},
		},
	] as unknown as Dumrel.ValencyFrame;

test("a Valency Frame's preposition takes a case the table allows", () => {
	const warten = {
		unitKind: "Reading",
		emojiDescription: "⏳",
		lemma: {
			unitKind: "Lemma",
			language: "de",
			family: "Lexeme",
			kind: "VERB",
			canonicalForm: "warten",
			coreFeatures: {
				hasSepPrefix: null,
				lexicallyReflexive: null,
				verbType: null,
			},
		},
	} as const satisfies Dumling.Reading<"de", "Lexeme", "VERB">;
	// Dumrel checks the frame's shape only, so `für` + Dat parses there.
	for (const valency of [frame("auf", "Acc"), frame("für", "Dat")])
		expect(
			parseReadingKnowledge({ source: warten, knowledge: { valency } })
				.success,
		).toBe(true);
	expect(frameAdpositionCaseIssues(frame("auf", "Acc"))).toEqual([]);
	expect(frameAdpositionCaseIssues(frame("auf", "Dat"))).toEqual([]);
	expect(frameAdpositionCaseIssues(frame("für", "Dat"))).toEqual([
		{ path: "0.complement.case", message: "für does not take Dat" },
	]);
});

test("the table keys a position-dependent case by adpType", () => {
	const entlang = (adpType: string) =>
		germanAdpositionCases({
			canonicalForm: "entlang",
			coreFeatures: { adpType },
		})?.allowed;
	expect(entlang("Post")).toEqual(["Acc"]);
	expect(entlang("Prep")).toEqual(["Gen", "Dat"]);
	expect(
		germanAdpositionCases({ canonicalForm: "versus", coreFeatures: {} }),
	).toBeNull();
});

test("the table finds a circumposition written with … or ASCII ...", () => {
	const circumposition = (canonicalForm: string) => {
		const parsed = parseUnit(adposition(canonicalForm, "Circ"));
		if (!parsed.success || parsed.chain.unitKind !== "Lemma")
			throw Error(`Dumling rejects ${canonicalForm}`);
		return parsed.chain.value as Dumling.Lemma<"de", "Lexeme", "ADP">;
	};
	const ascii = circumposition("um ... willen");
	expect(ascii).toEqual(circumposition("um … willen"));
	expect(germanAdpositionCases(ascii)?.allowed).toEqual(["Gen"]);
	expect(
		germanAdpositionCases(adposition("um ... willen", "Circ"))?.allowed,
	).toEqual(["Gen"]);
});
