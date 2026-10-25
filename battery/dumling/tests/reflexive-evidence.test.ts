import { expect, test } from "bun:test";
import { parseUnit } from "../src/index.js";

const lemma = (kind: "VERB" | "ADJ", canonicalForm: string) => ({
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind,
	canonicalForm,
	coreFeatures:
		kind === "VERB" ? { hasSepPrefix: null } : { comparable: null },
});

/** *Sie erinnert sich an den Geruch*: `sich` fills `erinnern` 🪞🧠's Reflexive Slot. */
const erinnert = {
	unitKind: "Attestation",
	surface: {
		unitKind: "Surface",
		language: "de",
		normalizedSurface: "erinnert",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		lemma: lemma("VERB", "erinnern"),
		inflectionalFeatures: {
			verbForm: "Fin",
			tense: "Pres",
			mood: "Ind",
			person: "3",
			number: "Sing",
			expletive: null,
			perfect: null,
			future: null,
			passive: null,
			voice: null,
		},
	},
	realizationCoverage: "Full",
	members: [
		{ attested: "erinnert", orthography: "Standard" },
		{ attested: "sich", orthography: "Standard" },
	],
	expletiveEvidence: null,
	valencyEvidence: [
		{
			member: 1,
			complement: { kind: "Reflexive", governedCase: "Acc" },
			realizedCase: "Acc",
		},
	],
};
const [reflexive] = erinnert.valencyEvidence;

test("a verbal Attestation names its lexical reflexive member and its case (ADR 0052)", () => {
	expect(parseUnit(erinnert).success).toBe(true);
	for (const invalid of [
		[{ ...reflexive, member: null }],
		[{ ...reflexive, member: 2 }],
		[{ ...reflexive, realizedCase: "Dat" }],
		[{ ...reflexive, complement: { kind: "Reflexive" } }],
		[
			{
				...reflexive,
				complement: { kind: "Reflexive", governedCase: "Gen" },
				realizedCase: "Gen",
			},
		],
		[
			{
				...reflexive,
				complement: { ...reflexive?.complement, referent: "Someone" },
			},
		],
		[reflexive, { ...reflexive, member: 0 }],
	])
		expect(
			parseUnit({ ...erinnert, valencyEvidence: invalid }).success,
		).toBe(false);
});

test("a Reflexive whose case the occurrence hides may name no case, in neither field (ADR 0052)", () => {
	const caseless = { member: 1, complement: { kind: "Reflexive" } };
	expect(
		parseUnit({ ...erinnert, valencyEvidence: [caseless] }).success,
	).toBe(true);
	for (const invalid of [
		{ ...caseless, realizedCase: "Acc" },
		{ ...caseless, member: null },
		{ ...caseless, complement: { kind: "Case" } },
		{ ...reflexive, realizedCase: undefined },
	])
		expect(
			parseUnit({ ...erinnert, valencyEvidence: [invalid] }).success,
		).toBe(false);
});

test("an adjective or noun names no Reflexive", () => {
	const stolz = {
		...erinnert,
		surface: {
			...erinnert.surface,
			normalizedSurface: "stolz",
			lemma: lemma("ADJ", "stolz"),
			inflectionalFeatures: null,
		},
		members: [
			{ attested: "stolz", orthography: "Standard" },
			{ attested: "sich", orthography: "Standard" },
		],
	};
	const { expletiveEvidence: _, ...rest } = stolz;
	const adjective = { ...rest, articleEvidence: null };
	expect(parseUnit({ ...adjective, valencyEvidence: [] }).success).toBe(true);
	expect(parseUnit(adjective).success).toBe(false);
});

test("a Reflexive inside a fixed phrase names the preposition it follows (ADR 0052)", () => {
	// *Er war außer sich*: `sich` is the object of `außer sein`'s `außer`.
	const ausser = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm: "außer",
		coreFeatures: {},
	};
	const complement = {
		kind: "Reflexive",
		governedCase: "Dat",
		preposition: ausser,
	};
	const valid = { ...reflexive, complement, realizedCase: "Dat" };
	expect(parseUnit({ ...erinnert, valencyEvidence: [valid] }).success).toBe(
		true,
	);
	for (const invalid of [
		{ ...valid, realizedCase: "Acc" },
		{
			...valid,
			complement: {
				...complement,
				preposition: { ...ausser, kind: "ADV" },
			},
		},
		{
			...valid,
			complement: {
				...complement,
				preposition: { ...ausser, language: "en" },
			},
		},
	])
		expect(
			parseUnit({ ...erinnert, valencyEvidence: [invalid] }).success,
		).toBe(false);
});
