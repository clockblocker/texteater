import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	attested,
	fakeJev,
	resolveOnce,
	sentenceOf,
	unitOf,
	writes,
} from "./support.js";

// The one stored Lemma found under the headword's words writes the
// headword (#1337): no Canonical Form call, jev still judging the Core
// Features and every member's orthography.

const lemmaOf = (
	kind: string,
	canonicalForm: string,
	coreFeatures: Record<string, unknown> = {},
) =>
	({
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind,
		canonicalForm,
		coreFeatures,
	}) as Dumling.Lemma<"de">;

const gerät = lemmaOf("NOUN", "Gerät", { gender: "Neut" });
// Sie0 _1 sieht2 _3 die4 _5 Geräte6 .7
const devices = {
	sentence: sentenceOf("Sie sieht die Geräte."),
	unit: unitOf([4, 6], "Lexeme/NOUN"),
};
const plural = { number: "Plur", case: "Acc" };

test("a NOUN whose word a stored Surface spells takes that Lemma's headword and gender, with no Luna call", async () => {
	const luna = writes("never asked");
	const { result, trace } = await resolveOnce(
		{ jev: fakeJev(plural).ask, luna: luna.ask },
		{
			...devices,
			lemmaCandidates: [{ lemma: gerät, foundUnder: ["Geräte"] }],
		},
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma).toMatchObject({
		canonicalForm: "Gerät",
		coreFeatures: { gender: "Neut" },
	});
	expect(attestation.surface.normalizedSurface).toBe("Geräte");
	expect(luna.sent).toEqual([]);
	expect(result).not.toHaveProperty("drafted");
	expect(trace?.calls.map(({ stage }) => stage)).toEqual(["grammar"]);
});

test("a Lemma found under other letters, or one of two found under the same, leaves the headword to Luna", async () => {
	const elsewhere = writes("Gerät");
	await resolveOnce(
		{ jev: fakeJev(plural).ask, luna: elsewhere.ask },
		{
			...devices,
			// Found under the article only: no Surface spells Geräte.
			lemmaCandidates: [{ lemma: gerät, foundUnder: ["die"] }],
		},
	);
	expect(elsewhere.sent).toHaveLength(1);
	// der and das Band share a spelling: neither is taken.
	const band = writes("Band");
	await resolveOnce(
		{ jev: fakeJev({ number: "Sing", case: "Nom" }).ask, luna: band.ask },
		{
			// Das0 _1 Band2 _3 reißt4 .5
			sentence: sentenceOf("Das Band reißt."),
			unit: unitOf([0, 2], "Lexeme/NOUN"),
			lemmaCandidates: [
				{
					lemma: lemmaOf("NOUN", "Band", { gender: "Masc" }),
					foundUnder: ["Band"],
				},
				{
					lemma: lemmaOf("NOUN", "Band", { gender: "Neut" }),
					foundUnder: ["Band"],
				},
			],
		},
	);
	expect(band.sent).toHaveLength(1);
});

test("a member jev judges a Typo sends the headword to Luna after jev, with no guess asked before", async () => {
	const luna = writes("Gerät", ["Geräte"]);
	const { result, trace } = await resolveOnce(
		{ jev: fakeJev({ ...plural, orthography: "t1" }).ask, luna: luna.ask },
		{
			...devices,
			lemmaCandidates: [{ lemma: gerät, foundUnder: ["Geräte"] }],
		},
	);
	expect(attested(result).surface.lemma.canonicalForm).toBe("Gerät");
	expect(trace?.calls.map(({ stage }) => stage)).toEqual([
		"grammar",
		"canonical",
	]);
});

test("a stored adjective's headword sets the click's member in its lexical casing, and a VERB keeps jev's Core Features", async () => {
	// Elektrische0 _1 Geräte2 _3 summen4 .5
	const luna = writes("never asked");
	const { result } = await resolveOnce(
		{ jev: fakeJev({ case: "Nom", number: "Plur" }).ask, luna: luna.ask },
		{
			sentence: sentenceOf("Elektrische Geräte summen."),
			unit: unitOf([0], "Lexeme/ADJ"),
			lemmaCandidates: [
				{
					lemma: lemmaOf("ADJ", "elektrisch"),
					foundUnder: ["Elektrische"],
				},
			],
		},
	);
	expect(attested(result).surface).toMatchObject({
		lemma: { canonicalForm: "elektrisch" },
		normalizedSurface: "elektrische",
	});
	// Er0 _1 liest2 .3
	const verb = await resolveOnce(
		{ jev: fakeJev().ask, luna: luna.ask },
		{
			sentence: sentenceOf("Er liest."),
			unit: unitOf([2], "Lexeme/VERB"),
			lemmaCandidates: [
				{
					lemma: lemmaOf("VERB", "lesen", { hasSepPrefix: null }),
					foundUnder: ["liest"],
				},
			],
		},
	);
	expect(attested(verb.result).surface.lemma.canonicalForm).toBe("lesen");
	expect(luna.sent).toEqual([]);
});

test("an adverb is never looked up: a bare w-word or mehr spelled as a stored adverb is often another Lemma", async () => {
	const luna = writes("viel");
	const { result } = await resolveOnce(
		{
			jev: fakeJev({ comparable: "Yes", degree: "Cmp" }).ask,
			luna: luna.ask,
		},
		{
			// Er0 _1 isst2 _3 mehr4 .5
			sentence: sentenceOf("Er isst mehr."),
			unit: unitOf([4], "Lexeme/ADV"),
			lemmaCandidates: [
				{ lemma: lemmaOf("ADV", "mehr"), foundUnder: ["mehr"] },
			],
		},
	);
	expect(attested(result).surface.lemma.canonicalForm).toBe("viel");
	expect(luna.sent).toHaveLength(1);
});
