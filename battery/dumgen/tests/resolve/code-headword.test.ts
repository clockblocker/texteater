import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
} from "./support.js";

// Code writes the headword where the route settles it (#1326): no
// Canonical Form call, and the description drafted beside jev only for a
// Lemma with no stored or authored Reading.

/** Luna answering a description asked alone with ➕, and the Canonical Form call with `canonicalForm`. */
const luna = (canonicalForm: string) =>
	fakeLuna((input) =>
		"markedSentence" in input && input.members.length === 0
			? "➕"
			: {
					canonicalForm,
					members: input.members.map(() => canonicalForm),
					emojiDescription: "🔁",
				},
	);

const conjunction = {
	// Aber0 _1 es2 _3 regnet4 .5
	sentence: sentenceOf("Aber es regnet."),
	unit: unitOf([0], "Lexeme/CCONJ"),
};

test("a conjunction jev judges spelled as written takes its lowercase word as headword, Luna drafting only its description", async () => {
	const writer = luna("never asked");
	const { result, trace } = await resolveOnce(
		{ jev: fakeJev().ask, luna: writer.ask },
		conjunction,
	);
	const attestation = attested(result);
	expect(attestation.surface.lemma.canonicalForm).toBe("aber");
	expect(attestation.surface.normalizedSurface).toBe("aber");
	expect(attestation.members).toEqual([
		{ attested: "Aber", orthography: "Standard" },
	]);
	expect(result).toMatchObject({ drafted: "➕" });
	expect(trace?.calls.map(({ stage }) => stage).sort()).toEqual([
		"emojiDescription",
		"grammar",
	]);
	expect(writer.sent[0]?.input).toEqual({
		markedSentence: "<TARGET>Aber</TARGET> es regnet.",
		lemma: "aber",
	});
});

test("a stored Lemma of the code's headword needs no Luna call, so the judge of its stored Readings runs first", async () => {
	const stored: Dumling.Lemma<"de"> = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "CCONJ",
		canonicalForm: "aber",
		coreFeatures: {},
	};
	const writer = luna("never asked");
	const { result, trace } = await resolveOnce(
		{ jev: fakeJev().ask, luna: writer.ask },
		{
			...conjunction,
			lemmaCandidates: [{ lemma: stored, foundUnder: ["Aber"] }],
		},
	);
	expect(attested(result).surface.lemma.canonicalForm).toBe("aber");
	expect(result).not.toHaveProperty("drafted");
	expect(writer.sent).toEqual([]);
	expect(trace?.calls.map(({ stage }) => stage)).toEqual(["grammar"]);
});

test("a member jev judges a Typo, or a spelling no dictionary gives first, sends the headword to Luna after jev, the draft interrupted", async () => {
	const judged: readonly Record<string, string>[] = [
		{ orthography: "t0" },
		{ spelling: "Historical" },
	];
	for (const answers of judged) {
		const writer = fakeLuna(
			(input) =>
				"markedSentence" in input && input.members.length === 0
					? "➕"
					: {
							canonicalForm: "aber",
							members: ["aber"],
							emojiDescription: "🔁",
						},
			{ delayMs: 20 },
		);
		const { result, trace } = await resolveOnce(
			{ jev: fakeJev(answers).ask, luna: writer.ask },
			conjunction,
		);
		expect(result).toMatchObject({ drafted: "🔁" });
		expect(
			trace?.calls.map(({ stage, failure }) => [stage, failure?.tag]),
		).toEqual([
			["emojiDescription", "Interrupted"],
			["grammar", undefined],
			["canonical", undefined],
		]);
	}
});

test("an adverb in its comparative is Luna's, and an ADP the ADP Case Table lists is code's", async () => {
	// Er0 _1 kommt2 _3 öfter4 .5
	const often = luna("oft");
	const compared = await resolveOnce(
		{
			jev: fakeJev({ comparable: "Yes", degree: "Cmp" }).ask,
			luna: often.ask,
		},
		{
			sentence: sentenceOf("Er kommt öfter."),
			unit: unitOf([4], "Lexeme/ADV"),
		},
	);
	expect(attested(compared.result).surface.lemma.canonicalForm).toBe("oft");
	// The draft started on the guess that code's öfter stands is dropped,
	// and the Canonical Form call drafts the description.
	expect(compared.trace?.calls.map(({ stage }) => stage)).toEqual([
		"emojiDescription",
		"grammar",
		"canonical",
	]);
	expect(compared.result).toMatchObject({ drafted: "🔁" });
	// Mit0 _1 dir2 .3
	const along = luna("never asked");
	const adposition = await resolveOnce(
		{ jev: fakeJev().ask, luna: along.ask },
		{ sentence: sentenceOf("Mit dir."), unit: unitOf([0], "Lexeme/ADP") },
	);
	expect(attested(adposition.result).surface.lemma.canonicalForm).toBe("mit");
	// mit has an authored Reading for the judge, so nothing is drafted.
	expect(along.sent).toEqual([]);
});
