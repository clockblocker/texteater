import { expect, test } from "bun:test";
import { isRecord } from "common-utils";
import { sameLemma } from "dumling";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { InvalidModelOutput } from "../../src/errors.js";
import { operations } from "../../src/operations.js";
import { generation } from "../../src/resolve/de/reading-prompts.js";
import {
	draftPrompt,
	draftsEmojiDescription,
} from "../../src/resolve/reading.js";
import { liveOver } from "../live-over.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
	writes,
} from "./support.js";

// Luna writes the Canonical Form and spellings (#862, #639, #764).

test("Luna writes the Canonical Form in lexical casing with the unit's stored Lemmas as hints, and nothing lowercases by position", async () => {
	// Mangels0 _1 Beweisen2 _3 kam4 _5 er6 _7 frei8 .9
	const luna = writes("mangels", ["mangels"]);
	const stored: Dumling.Lemma<"de"> = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "ADP",
		canonicalForm: "mangels",
		coreFeatures: {},
	};
	const elsewhere: Dumling.Lemma<"de"> = { ...stored, canonicalForm: "mit" };
	const { result } = await resolveOnce(
		{ jev: fakeJev().ask, luna: luna.ask },
		{
			sentence: sentenceOf("Mangels Beweisen kam er frei."),
			unit: unitOf([0], "Lexeme/ADP"),
			lemmaCandidates: [
				{ lemma: stored, foundUnder: ["Mangels"] },
				{ lemma: elsewhere, foundUnder: ["mit"] },
			],
		},
	);
	expect(attested(result).surface.normalizedSurface).toBe("mangels");
	const input = luna.sent[0]?.input;
	expect(input).toHaveProperty("lemmaCandidates", [
		{ canonicalForm: "mangels", coreFeatures: {} },
	]);
	expect(input).toHaveProperty("members", [
		{ member: "m0", text: "Mangels", orthography: "Standard" },
	]);
	expect(luna.sent[0]?.systemPrompt).toContain(
		"never the casing the word's position gives",
	);
	// Luna keeping the position's capital is kept: code never lowercases.
	const capital = await resolveOnce(
		{ jev: fakeJev().ask, luna: writes("mangels", ["Mangels"]).ask },
		{
			sentence: sentenceOf("Mangels Beweisen kam er frei."),
			unit: unitOf([0], "Lexeme/ADP"),
		},
	);
	expect(attested(capital.result).surface.normalizedSurface).toBe("Mangels");
});

test("Luna drafts the Emoji Description after the headword in the same call, from the unit marked as resolve.reading marks it", async () => {
	// Das0 _1 Schloss2 _3 klemmt4 .5
	const luna = fakeLuna(({ members }) => ({
		canonicalForm: "Schloss",
		members: members.map(({ text }) => text),
		article: "das",
		emojiDescription: " 🏰️",
	}));
	// A stored Lemma found under the word reaches the call as a hint.
	const stored: Dumling.Lemma<"de"> = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Schloss",
		coreFeatures: { gender: "Neut" },
	};
	const { result } = await resolveOnce(
		{ jev: fakeJev().ask, luna: luna.ask },
		{
			sentence: sentenceOf("Das Schloss klemmt."),
			unit: unitOf([2], "Lexeme/NOUN"),
			lemmaCandidates: [{ lemma: stored, foundUnder: ["Schloss"] }],
		},
	);
	expect(luna.sent).toHaveLength(1);
	const [request] = luna.sent;
	// The drafter's one input sits in its own block; everything else is
	// the Canonical Form's. Sent on the guess, the call has no judged
	// features yet.
	expect(request?.input).toEqual({
		route: "Lexeme NOUN",
		sentence: "Das Schloss klemmt.",
		marked: "Das ⟦Schloss⟧ klemmt.",
		members: [{ member: "m0", text: "Schloss", orthography: "Standard" }],
		lemmaCandidates: [
			{ canonicalForm: "Schloss", coreFeatures: { gender: "Neut" } },
		],
		emojiDescriptionInput: {
			markedSentence: "Das <TARGET>Schloss</TARGET> klemmt.",
		},
	});
	// The draft's block comes first, so Luna reads the marked Sentence
	// before anything of the Canonical Form's.
	expect(Object.keys(isRecord(request?.input) ? request.input : {})[0]).toBe(
		"emojiDescriptionInput",
	);
	// No stored Emoji Description, or any other emoji, reaches the input.
	expect(JSON.stringify(request?.input)).not.toMatch(
		/\p{Extended_Pictographic}/u,
	);
	expect(request?.systemPrompt).toContain(generation.draftScope);
	const outputSchema = request?.outputSchema;
	const schema = isRecord(outputSchema) ? outputSchema : {};
	// The description comes first, before the headword: written after it,
	// it took the headword's most common sense (#1165).
	expect(
		Object.keys(isRecord(schema.properties) ? schema.properties : {}),
	).toEqual(["emojiDescription", "canonicalForm", "members", "article"]);
	expect(schema.required).toEqual([
		"emojiDescription",
		"canonicalForm",
		"members",
		"article",
	]);
	expect(request?.systemPrompt).toContain(draftPrompt);
	expect(request?.systemPrompt).toContain(generation.copula);
	// Dumling's parse drops the variation selector.
	expect(result).toMatchObject({ _tag: "Resolved", drafted: "🏰" });
});

test("a draft that is no Emoji Description is dropped and the headword kept, and Foreign material or a closed PART drafts none", async () => {
	const castle = fakeLuna(({ members }) => ({
		canonicalForm: "Schloss",
		members: members.map(({ text }) => text),
		article: "das",
		emojiDescription: "castle",
	}));
	const dropped = await resolveOnce(
		{ jev: fakeJev().ask, luna: castle.ask },
		{
			sentence: sentenceOf("Das Schloss klemmt."),
			unit: unitOf([2], "Lexeme/NOUN"),
		},
	);
	expect(attested(dropped.result).surface.lemma.canonicalForm).toBe(
		"Schloss",
	);
	expect(dropped.result).not.toHaveProperty("drafted");
	expect(dropped.trace?.events).toEqual([
		{ name: "DraftDropped", data: { drafted: "castle" } },
	]);
	// Er0 _1 sagte2 _3 cool4 .5
	const foreign = writes("cool");
	const cool = await resolveOnce(
		{ jev: fakeJev().ask, luna: foreign.ask },
		{
			sentence: sentenceOf("Er sagte cool."),
			unit: unitOf([4], "Foreign/Foreign"),
		},
	);
	expect(cool.result).not.toHaveProperty("drafted");
	expect(foreign.sent[0]?.input).not.toHaveProperty("emojiDescriptionInput");
	expect(foreign.sent[0]?.outputSchema).not.toMatchObject({
		properties: { emojiDescription: expect.anything() },
	});
	expect(foreign.sent[0]?.systemPrompt).not.toContain(draftPrompt);
	expect(
		draftsEmojiDescription({
			language: "de",
			family: "Lexeme",
			kind: "PART",
		}),
	).toBe(false);
});

test("Luna may correct a Typo, while a Standard member keeps its letters in Luna's casing", async () => {
	const sentence = sentenceOf("Er kommt.");
	const unit = unitOf([2], "Lexeme/VERB");
	// Luna writing the headword form of a Standard member changes nothing.
	const changed = await resolveOnce(
		{ jev: fakeJev().ask, luna: writes("kommen", ["kam"]).ask },
		{ sentence, unit },
	);
	expect(attested(changed.result).surface.normalizedSurface).toBe("kommt");
	const typo = await resolveOnce(
		{
			jev: fakeJev({ orthography: "t0" }).ask,
			luna: writes("kommen", ["kommt"]).ask,
		},
		{ sentence: sentenceOf("Er komt."), unit },
	);
	const attestation = attested(typo.result);
	expect(attestation.members[0]).toEqual({
		attested: "komt",
		orthography: "Typo",
	});
	expect(attestation.surface.normalizedSurface).toBe("kommt");
	// A Standard member Luna dropped keeps its letters; the Typo still gets
	// Luna's word, and a Standard member Luna recased keeps that casing.
	const dropped = await resolveOnce(
		{
			// An imperative keeps its own order (system ADR 0056).
			jev: fakeJev({ orthography: "t2", mood: "Imp" }).ask,
			luna: writes("hereinkommen", ["komm", "herein"]).ask,
		},
		{
			sentence: sentenceOf("Komm doch herrein."),
			unit: unitOf([0, 2, 4], "Lexeme/VERB"),
		},
	);
	expect(attested(dropped.result).surface.normalizedSurface).toBe(
		"komm doch herein",
	);
	// Too few words for the members Luna writes is no answer.
	const short = await Effect.runPromise(
		Effect.flip(
			operations.resolve
				.grammar({
					language: "de",
					sentence: sentenceOf("Komm doch herrein."),
					unit: unitOf([0, 2, 4], "Lexeme/VERB"),
					neighbours: {},
					lemmaCandidates: [],
				})
				.pipe(
					Effect.provide(
						liveOver({
							jev: fakeJev({ orthography: "t2" }).ask,
							luna: writes("hereinkommen", ["komm", "doch"]).ask,
						}),
					),
				),
		),
	);
	expect(short).toBeInstanceOf(InvalidModelOutput);
});

test("INTJ LOL and lol resolve to one Lemma, while NOUN Morgen and ADV morgen stay two", async () => {
	const stored: Dumling.Lemma<"de"> = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "INTJ",
		canonicalForm: "LOL",
		coreFeatures: { partType: null },
	};
	const lol = async (text: string, written: string) =>
		attested(
			(
				await resolveOnce(
					{
						jev: fakeJev({ answer: "None" }).ask,
						luna: writes(written).ask,
					},
					{
						sentence: sentenceOf(`Er schrieb ${text}.`),
						unit: unitOf([4], "Lexeme/INTJ"),
						lemmaCandidates: [
							{ lemma: stored, foundUnder: [text] },
						],
					},
				)
			).result,
		).surface.lemma;
	const upper = await lol("LOL", "LOL");
	const lower = await lol("lol", "lol");
	expect(sameLemma(upper, lower)).toBe(true);
	expect(sameLemma(upper, stored)).toBe(true);
	const noun = attested(
		(
			await resolveOnce(
				{
					jev: fakeJev({
						gender: "der",
						number: "Sing",
						case: "Nom",
					}).ask,
					luna: writes("Morgen").ask,
				},
				{
					sentence: sentenceOf("Der Morgen kam."),
					unit: unitOf([0, 2], "Lexeme/NOUN"),
				},
			)
		).result,
	).surface.lemma;
	const adverb = attested(
		(
			await resolveOnce(
				{
					jev: fakeJev({ comparable: "No" }).ask,
					luna: writes("morgen").ask,
				},
				{
					sentence: sentenceOf("Wir kommen morgen."),
					unit: unitOf([4], "Lexeme/ADV"),
				},
			)
		).result,
	).surface.lemma;
	expect(sameLemma(noun, adverb)).toBe(false);
});
