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
		// Unlisted, so any oblique case until #652 decides.
		["à", "Dat", "Prep"],
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
	expect(entlang("Post")).toEqual(["Acc", "Dat"]);
	expect(entlang("Prep")).toEqual(["Gen", "Dat"]);
	// Duden gives à no case; what an unlisted adposition records is #652.
	expect(
		germanAdpositionCases({ canonicalForm: "à", coreFeatures: {} }),
	).toBeNull();
});

test("laut, ab, zufolge and binnen take the cases the table lists", () => {
	const passes = (
		canonicalForm: string,
		realizedCase: string,
		adpType = "Prep",
	) =>
		attestationAdpositionCaseIssues(
			adpAttestation(canonicalForm, realizedCase, adpType),
		).length === 0;
	// laut dem Bericht, laut des Berichts; not laut + Acc.
	expect(passes("laut", "Dat")).toBe(true);
	expect(passes("laut", "Gen")).toBe(true);
	expect(passes("laut", "Acc")).toBe(false);
	// ab dem 1. Mai, ab ersten Mai; not ab + Gen.
	expect(passes("ab", "Dat")).toBe(true);
	expect(passes("ab", "Acc")).toBe(true);
	expect(passes("ab", "Gen")).toBe(false);
	// dem Bericht zufolge; Post zufolge + Gen fails, Prep zufolge takes it.
	expect(passes("zufolge", "Dat", "Post")).toBe(true);
	expect(passes("zufolge", "Gen", "Post")).toBe(false);
	expect(passes("zufolge", "Gen", "Prep")).toBe(true);
	// binnen einer Woche.
	expect(passes("binnen", "Dat")).toBe(true);
});

test("the table lists the new circumpositions with …", () => {
	for (const [canonicalForm, allowed] of [
		["von … her", ["Dat"]],
		["um … herum", ["Acc"]],
		["auf … hin", ["Acc"]],
		["zu … hin", ["Dat"]],
		["über … hinweg", ["Acc"]],
		["von … wegen", ["Gen"]],
		["an … entlang", ["Dat"]],
	] as const)
		expect(
			germanAdpositionCases({
				canonicalForm,
				coreFeatures: { adpType: "Circ" },
			})?.allowed,
		).toEqual(allowed);
});

test("the table finds a circumposition, a Locution ADP, written with … or ASCII ...", () => {
	const circumposition = (canonicalForm: string) => {
		const parsed = parseUnit({
			unitKind: "Lemma",
			language: "de",
			family: "Locution",
			kind: "ADP",
			canonicalForm,
			coreFeatures: {},
		});
		if (!parsed.success || parsed.chain.unitKind !== "Lemma")
			throw Error(`Dumling rejects ${canonicalForm}`);
		return parsed.chain.value as Dumling.Lemma<"de", "Locution", "ADP">;
	};
	const ascii = circumposition("um ... willen");
	expect(ascii).toEqual(circumposition("um … willen"));
	expect(germanAdpositionCases(ascii)?.allowed).toEqual(["Gen"]);
	expect(
		germanAdpositionCases({
			canonicalForm: "um ... willen",
			coreFeatures: {},
		})?.allowed,
	).toEqual(["Gen"]);
});

test("a Locution governor's preposition slot is checked like a Lexeme's", () => {
	const locution = (grammaticalCase: string): Dumling.Attestation => {
		const parsed = parseUnit({
			unitKind: "Attestation",
			members: [
				{ attested: "Angst", orthography: "Standard" },
				{ attested: "vor", orthography: "Standard" },
				{ attested: "hat", orthography: "Standard" },
			],
			realizationCoverage: "Full",
			expletiveEvidence: null,
			valencyEvidence: [
				{
					member: 1,
					complement: {
						kind: "Preposition",
						preposition: adposition("vor"),
						case: grammaticalCase,
						referent: "Either",
					},
					realizedCase: grammaticalCase,
				},
			],
			surface: {
				unitKind: "Surface",
				language: "de",
				normalizedSurface: "Angst hat",
				spelling: "Canonical",
				surfaceFeatures: null,
				inflectionalFeatures: null,
				lemma: {
					unitKind: "Lemma",
					language: "de",
					family: "Locution",
					kind: "VERB",
					canonicalForm: "Angst haben",
					coreFeatures: {},
				},
			},
		});
		if (!parsed.success || parsed.chain.unitKind !== "Attestation")
			throw Error(`Dumling rejects Angst haben vor + ${grammaticalCase}`);
		return parsed.chain.value;
	};
	expect(attestationAdpositionCaseIssues(locution("Dat"))).toEqual([]);
	expect(attestationAdpositionCaseIssues(locution("Gen"))).toEqual([
		{
			path: "valencyEvidence.0.complement.case",
			message: "vor does not take Gen",
		},
	]);
});
