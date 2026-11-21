import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { lunaRequestAhead } from "../../src/resolve/luna-ahead.js";
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

test("a stored NOUN or VERB Lexeme with a guessed governed preposition is likely looked up, while a Locution is unaffected", async () => {
	// Der0 _1 Geruch2 _3 von4 _5 Blumen6 .7
	const geruch = lemmaOf("NOUN", "Geruch", { gender: "Masc" });
	const nounInput = {
		language: "de" as const,
		neighbours: {},
		sentence: sentenceOf("Der Geruch von Blumen."),
		unit: unitOf([0, 2, 4], "Lexeme/NOUN"),
		lemmaCandidates: [{ lemma: geruch, foundUnder: ["Geruch"] }],
	};
	expect(Effect.runSync(lunaRequestAhead(nounInput))).toBeUndefined();
	const nounLuna = writes("never asked");
	const noun = await resolveOnce(
		{
			jev: fakeJev({
				number: "Sing",
				case: "Nom",
				governed_m2: "Governed",
			}).ask,
			luna: nounLuna.ask,
		},
		nounInput,
	);
	expect(attested(noun.result).surface.lemma).toMatchObject({
		canonicalForm: "Geruch",
		coreFeatures: { gender: "Masc" },
	});
	expect(nounLuna.sent).toEqual([]);

	// Sie0 _1 träumt2 _3 von4 _5 ihm6 .7
	const träumen = lemmaOf("VERB", "träumen", { hasSepPrefix: null });
	const verbInput = {
		language: "de" as const,
		neighbours: {},
		sentence: sentenceOf("Sie träumt von ihm."),
		unit: unitOf([2, 4], "Lexeme/VERB"),
		lemmaCandidates: [{ lemma: träumen, foundUnder: ["träumt"] }],
	};
	expect(Effect.runSync(lunaRequestAhead(verbInput))).toBeUndefined();
	const verbLuna = writes("never asked");
	const verb = await resolveOnce(
		{
			jev: fakeJev({ governed_m1: "Governed" }).ask,
			luna: verbLuna.ask,
		},
		verbInput,
	);
	expect(attested(verb.result).surface.lemma.canonicalForm).toBe("träumen");
	expect(verbLuna.sent).toEqual([]);

	// A Locution's governed preposition stays inside the headword, so it is
	// not dropped as a satellite in lookupHeadword.likely.
	// Sie0 _1 nahm2 _3 Rücksicht4 _5 auf6 _7 ihn8 .9
	const rücksicht: Dumling.Lemma<"de"> = {
		unitKind: "Lemma",
		language: "de",
		family: "Locution",
		kind: "VERB",
		canonicalForm: "Rücksicht nehmen",
		coreFeatures: {},
	};
	const locutionInput = {
		language: "de" as const,
		neighbours: {},
		sentence: sentenceOf("Sie nahm Rücksicht auf ihn."),
		unit: unitOf([2, 4, 6], "Locution/VERB"),
		lemmaCandidates: [{ lemma: rücksicht, foundUnder: ["nahm Rücksicht"] }],
	};
	expect(Effect.runSync(lunaRequestAhead(locutionInput))).toBeDefined();
});
