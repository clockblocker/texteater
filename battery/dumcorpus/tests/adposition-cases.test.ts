import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import {
	attestationAdpositionCaseIssues,
	frameAdpositionCaseIssues,
	germanAdpositionAllowedCases,
	germanAdpositionAllows,
	germanAdpositionEntry,
} from "../src/index.js";

const adposition = (canonicalForm: string) => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "ADP",
	canonicalForm,
	coreFeatures: {},
});

const caseSlot = (realizedCase: string) => ({
	member: null,
	complement: {
		kind: "Case",
		governedCase: realizedCase,
		referent: "Either",
	},
	realizedCase,
});

/** An ADP occurrence with the case its complement took, as Dumling parses it. */
function adpAttestation(
	canonicalForm: string,
	realizedCase: string | null,
	family: "Lexeme" | "Locution" = "Lexeme",
): Dumling.Attestation {
	const parsed = parseUnit({
		unitKind: "Attestation",
		members: [{ attested: canonicalForm, orthography: "Standard" }],
		realizationCoverage: "Full",
		valencyEvidence: realizedCase === null ? [] : [caseSlot(realizedCase)],
		surface: {
			unitKind: "Surface",
			language: "de",
			normalizedSurface: canonicalForm,
			spelling: { kind: "Canonical" },
			surfaceFeatures: null,
			lemma:
				family === "Lexeme"
					? adposition(canonicalForm)
					: {
							unitKind: "Lemma",
							language: "de",
							family,
							kind: "ADP",
							canonicalForm,
							coreFeatures: {},
						},
		},
	});
	if (!parsed.success || parsed.chain.unitKind !== "Attestation")
		throw Error(`Dumling rejects ${canonicalForm} + ${realizedCase}`);
	return parsed.chain.value;
}

test("an ADP occurrence takes a case one of its positions allows", () => {
	for (const [canonicalForm, realizedCase] of [
		["auf", "Dat"],
		["auf", "Acc"],
		["wegen", "Dat"],
		["wegen", "Gen"],
		// Post entlang takes Acc and Dat, Prep entlang Gen and Dat; the
		// occurrence records no position, so any of them passes.
		["entlang", "Acc"],
		["entlang", "Dat"],
		["entlang", "Gen"],
		["zufolge", "Dat"],
		["zufolge", "Gen"],
		["versus", "Acc"],
		["versus", null],
	] as const)
		expect(
			attestationAdpositionCaseIssues(
				adpAttestation(canonicalForm, realizedCase),
			),
		).toEqual([]);
});

test("a case none of its positions takes passes Dumling and fails dumcorpus", () => {
	expect(
		attestationAdpositionCaseIssues(adpAttestation("auf", "Gen")),
	).toEqual([
		{
			path: "valencyEvidence.0.realizedCase",
			message: "auf does not take Gen",
		},
	]);
	for (const [canonicalForm, realizedCase] of [
		["für", "Dat"],
		["mit", "Acc"],
		["zufolge", "Acc"],
		["halber", "Dat"],
	] as const)
		expect(
			attestationAdpositionCaseIssues(
				adpAttestation(canonicalForm, realizedCase),
			),
		).toHaveLength(1);
});

test("an adposition the table does not list fails and names the missing entry", () => {
	// Dumling takes à with any oblique case or none; dumcorpus reports the gap
	// instead of accepting any case.
	for (const realizedCase of ["Dat", null])
		expect(
			attestationAdpositionCaseIssues(adpAttestation("à", realizedCase)),
		).toEqual([
			{
				path: "surface.lemma",
				message: "The ADP Case Table does not list à",
			},
		]);
	expect(germanAdpositionAllows(adposition("à"), "Dat")).toBe(false);
	expect(germanAdpositionEntry(adposition("à"))).toBeNull();
});

const prepositionComplement = (
	canonicalForm: string,
	grammaticalCase: string,
) => ({
	kind: "Preposition",
	preposition: adposition(canonicalForm),
	governedCase: grammaticalCase,
	referent: "Either",
});
const frame = (canonicalForm: string, grammaticalCase: string) =>
	[
		{
			status: "Optional",
			complements: [
				prepositionComplement(canonicalForm, grammaticalCase),
			],
		},
	] as unknown as Dumrel.ValencyFrame;

test("a Valency Frame's preposition is listed and takes the slot's case", () => {
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
			},
		},
	} as const satisfies Dumling.Reading<"de", "Lexeme", "VERB">;
	// Dumrel checks the frame's shape only, so für + Dat and à parse there.
	for (const valency of [
		frame("auf", "Acc"),
		frame("für", "Dat"),
		frame("à", "Dat"),
	])
		expect(
			parseReadingKnowledge({ source: warten, knowledge: { valency } })
				.success,
		).toBe(true);
	expect(frameAdpositionCaseIssues(frame("auf", "Acc"))).toEqual([]);
	expect(frameAdpositionCaseIssues(frame("auf", "Dat"))).toEqual([]);
	expect(frameAdpositionCaseIssues(frame("für", "Dat"))).toEqual([
		{
			path: "0.complements.0.governedCase",
			message: "für does not take Dat",
		},
	]);
	expect(frameAdpositionCaseIssues(frame("à", "Dat"))).toEqual([
		{
			path: "0.complements.0.preposition",
			message: "The ADP Case Table does not list à",
		},
	]);
	// Every Preposition alternative is checked, not just the first.
	const alternatives = [
		{
			status: "Optional",
			complements: [
				prepositionComplement("über", "Acc"),
				{ kind: "Clause", form: "Dass" },
				prepositionComplement("von", "Acc"),
			],
		},
	] as unknown as Dumrel.ValencyFrame;
	expect(frameAdpositionCaseIssues(alternatives)).toEqual([
		{
			path: "0.complements.2.governedCase",
			message: "von does not take Acc",
		},
	]);
});

test("the table lists each Lexeme ADP's positions with a case set each", () => {
	const positions = (canonicalForm: string) => {
		const entry = germanAdpositionEntry(adposition(canonicalForm));
		if (entry?.family !== "Lexeme")
			throw Error(`${canonicalForm} unlisted`);
		return Object.fromEntries(
			Object.entries(entry.positions).map(([position, cases]) => [
				position,
				cases.allowed,
			]),
		);
	};
	expect(positions("entlang")).toEqual({
		Post: ["Acc", "Dat"],
		Prep: ["Gen", "Dat"],
	});
	expect(positions("wegen")).toEqual({ Prep: ["Gen", "Dat"], Post: ["Gen"] });
	expect(positions("zufolge")).toEqual({ Post: ["Dat"], Prep: ["Gen"] });
	expect(positions("halber")).toEqual({ Post: ["Gen"] });
	expect(positions("für")).toEqual({ Prep: ["Acc"] });
	expect(positions("auf")).toEqual({ Prep: ["Acc", "Dat"] });
	// den ganzen Tag über; Porto inklusive shows no case.
	expect(positions("über")).toEqual({ Prep: ["Acc", "Dat"], Post: ["Acc"] });
	expect(positions("inklusive")).toEqual({
		Prep: ["Gen", "Dat"],
		Post: [],
	});
	// inkl. is one Segment whose Surface is inklusive
	// (de/abbreviation-is-one-segment), so no ADP Lemma is inkl.
	expect(germanAdpositionEntry(adposition("inkl."))).toBeNull();
	// Positions follow Duden, the single standard.
	expect(positions("entgegen")).toEqual({ Prep: ["Dat"], Post: ["Dat"] });
	expect(positions("zugunsten")).toEqual({ Prep: ["Gen"], Post: ["Dat"] });
	expect(positions("zuungunsten")).toEqual({ Prep: ["Gen"], Post: ["Dat"] });
	expect(positions("hindurch")).toEqual({ Post: ["Acc"] });
	expect(positions("betreffend")).toEqual({ Prep: ["Acc"], Post: ["Acc"] });
	// Postposed eingedenk is Duden's adjective, an Eides statt its own
	// headword, and gleich's postposed use only grammis's.
	expect(positions("eingedenk")).toEqual({ Prep: ["Gen"] });
	expect(positions("statt")).toEqual({ Prep: ["Gen", "Dat"] });
	expect(positions("gleich")).toEqual({ Prep: ["Dat"] });
	const wegen = germanAdpositionEntry(adposition("wegen"));
	if (!wegen) throw Error("wegen unlisted");
	expect(germanAdpositionAllowedCases(wegen)).toEqual(["Gen", "Dat"]);
});

test("laut, ab and binnen take the cases the table lists", () => {
	const passes = (canonicalForm: string, realizedCase: string) =>
		attestationAdpositionCaseIssues(
			adpAttestation(canonicalForm, realizedCase),
		).length === 0;
	// laut dem Bericht, laut des Berichts; not laut + Acc.
	expect(passes("laut", "Dat")).toBe(true);
	expect(passes("laut", "Gen")).toBe(true);
	expect(passes("laut", "Acc")).toBe(false);
	// ab dem 1. Mai, ab ersten Mai; not ab + Gen.
	expect(passes("ab", "Dat")).toBe(true);
	expect(passes("ab", "Acc")).toBe(true);
	expect(passes("ab", "Gen")).toBe(false);
	// binnen einer Woche.
	expect(passes("binnen", "Dat")).toBe(true);
});

test("the table gives each Locution ADP one case set", () => {
	for (const [canonicalForm, allowed] of [
		["von … her", ["Dat"]],
		["um … herum", ["Acc"]],
		["auf … hin", ["Acc"]],
		["zu … hin", ["Dat"]],
		["über … hinweg", ["Acc"]],
		["von … wegen", ["Gen"]],
		["an … entlang", ["Dat"]],
		["im Vergleich zu", ["Dat"]],
	] as const) {
		const entry = germanAdpositionEntry({
			family: "Locution",
			canonicalForm,
		});
		expect(entry?.family).toBe("Locution");
		expect(entry && germanAdpositionAllowedCases(entry)).toEqual(allowed);
	}
	// A Lexeme ADP and a Locution ADP never share an entry.
	expect(
		germanAdpositionEntry({
			family: "Lexeme",
			canonicalForm: "um … willen",
		}),
	).toBeNull();
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
	expect(germanAdpositionEntry(ascii)).toEqual({
		family: "Locution",
		cases: { allowed: ["Gen"], preferred: null, twoWay: false },
	});
	expect(
		germanAdpositionAllows(
			{ family: "Locution", canonicalForm: "um ... willen" },
			"Gen",
		),
	).toBe(true);
	// Identity ignores letter case (ADR 0002), and so does the table.
	expect(
		germanAdpositionAllows(
			{ family: "Locution", canonicalForm: "Um … willen" },
			"Gen",
		),
	).toBe(true);
});

test("a Locution ADP occurrence is checked against its case set", () => {
	expect(
		attestationAdpositionCaseIssues(
			adpAttestation("um … willen", "Gen", "Locution"),
		),
	).toEqual([]);
	expect(
		attestationAdpositionCaseIssues(
			adpAttestation("von … an", null, "Locution"),
		),
	).toEqual([]);
	expect(
		attestationAdpositionCaseIssues(
			adpAttestation("um … willen", "Dat", "Locution"),
		),
	).toEqual([
		{
			path: "valencyEvidence.0.realizedCase",
			message: "um … willen does not take Dat",
		},
	]);
	expect(
		attestationAdpositionCaseIssues(
			adpAttestation("in Bezug auf", "Acc", "Locution"),
		),
	).toEqual([
		{
			path: "surface.lemma",
			message: "The ADP Case Table does not list in Bezug auf",
		},
	]);
});

test("a Locution governor's preposition slot is checked like a Lexeme's", () => {
	const locution = (
		preposition: string,
		grammaticalCase: string,
	): Dumling.Attestation => {
		const parsed = parseUnit({
			unitKind: "Attestation",
			members: [
				{ attested: "Angst", orthography: "Standard" },
				{ attested: preposition, orthography: "Standard" },
				{ attested: "hat", orthography: "Standard" },
			],
			realizationCoverage: "Full",
			expletiveEvidence: null,
			valencyEvidence: [
				{
					member: 1,
					complement: {
						kind: "Preposition",
						preposition: adposition(preposition),
						governedCase: grammaticalCase,
						referent: "Either",
					},
					realizedCase: grammaticalCase,
				},
			],
			surface: {
				unitKind: "Surface",
				language: "de",
				normalizedSurface: "Angst hat",
				spelling: { kind: "Canonical" },
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
			throw Error(
				`Dumling rejects Angst haben ${preposition} + ${grammaticalCase}`,
			);
		return parsed.chain.value;
	};
	expect(attestationAdpositionCaseIssues(locution("vor", "Dat"))).toEqual([]);
	expect(attestationAdpositionCaseIssues(locution("vor", "Gen"))).toEqual([
		{
			path: "valencyEvidence.0.complement.governedCase",
			message: "vor does not take Gen",
		},
	]);
	// A slot that relies on an entry the table lacks fails too.
	expect(attestationAdpositionCaseIssues(locution("à", "Dat"))).toEqual([
		{
			path: "valencyEvidence.0.complement.preposition",
			message: "The ADP Case Table does not list à",
		},
	]);
});
