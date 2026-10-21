import { expect, test } from "bun:test";
import { isRecord } from "common-utils";
import { sameLemma } from "dumling";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { createDumgen } from "../../src/create-dumgen.js";
import { InvalidModelOutput, ProviderFailure } from "../../src/errors.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import { generation } from "../../src/resolve/de/reading-prompts.js";
import {
	draftPrompt,
	draftsEmojiDescription,
} from "../../src/resolve/reading.js";
import type { JevAsk } from "../../src/segment/jev.js";
import { writes } from "./grammar-fixtures.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
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

// Luna writes while jev judges, on a guess at jev's answers.

/** Luna writing `guessed` before jev answers, without judged features, and `judged` after. */
const writesOnGuess = (guessed: string, judged: string) =>
	fakeLuna(
		(input) => {
			const { members } = input;
			const form = "judged" in input ? judged : guessed;
			return {
				canonicalForm: form,
				members: members.map(({ text }) => text),
			};
		},
		{ delayMs: 5 },
	);

test("Luna writes while jev judges, with no judged features, and its answer stands when jev changes nothing Luna reads", async () => {
	const gate = Promise.withResolvers<void>();
	const jev = fakeJev();
	const held: JevAsk = async (request, context) => {
		await gate.promise;
		return jev.ask(request, context);
	};
	const luna = writesOnGuess("merkwürdig", "never asked");
	const click = resolveOnce(
		{ jev: held, luna: luna.ask },
		{
			sentence: sentenceOf("Eine merkwürdige Geschichte."),
			unit: unitOf([2], "Lexeme/ADJ"),
		},
	);
	await Bun.sleep(10);
	// jev has not answered, and Luna has been asked.
	expect(jev.sent).toEqual([]);
	expect(luna.sent).toHaveLength(1);
	expect(luna.sent[0]?.input).not.toHaveProperty("judged");
	expect(luna.sent[0]?.input).toMatchObject({
		members: [
			{ member: "m0", text: "merkwürdige", orthography: "Standard" },
		],
	});
	gate.resolve();
	const { result, trace } = await click;
	expect(attested(result).surface.lemma.canonicalForm).toBe("merkwürdig");
	expect(luna.sent).toHaveLength(1);
	expect(trace?.calls.map(({ stage }) => stage).sort()).toEqual([
		"canonical",
		"grammar",
	]);
	expect(trace?.events).toBeUndefined();
});

test("a Typo jev finds makes Luna write again with jev's answers, and the guessed call is interrupted", async () => {
	// Er0 _1 kommmt2 .3
	const slowLuna = fakeLuna(
		(input) => ({
			canonicalForm: "judged" in input ? "kommen" : "kommmen",
			members: ["kommt"],
		}),
		{ delayMs: 50 },
	);
	const { result, trace } = await resolveOnce(
		{ jev: fakeJev({ orthography: "t0" }).ask, luna: slowLuna.ask },
		{
			sentence: sentenceOf("Er kommmt."),
			unit: unitOf([2], "Lexeme/VERB"),
		},
	);
	expect(attested(result).surface.lemma.canonicalForm).toBe("kommen");
	expect(slowLuna.sent).toHaveLength(2);
	expect(slowLuna.aborted).toEqual(["canonical"]);
	expect(slowLuna.sent[1]?.input).toMatchObject({
		members: [{ member: "m0", text: "kommmt", orthography: "Typo" }],
		judged: expect.any(Object),
	});
	expect(trace?.events).toEqual([
		{
			name: "CanonicalRewritten",
			data: { reason: "jev changed what Luna reads" },
		},
	]);
	// The guessed call settled, interrupted, before the trace was emitted.
	expect(
		trace?.calls.map(({ stage, failure }) => [stage, failure?.tag]),
	).toEqual([
		["canonical", "Interrupted"],
		["grammar", undefined],
		["canonical", undefined],
	]);
});

test("a verb headword written on the guess with a sich or a prefix jev judged away is written again", async () => {
	// Er0 _1 wäscht2 _3 sich4 .5: sich stays outside the unit.
	const washes = writesOnGuess("sich waschen", "waschen");
	const wash = await resolveOnce(
		{ jev: fakeJev().ask, luna: washes.ask },
		{
			sentence: sentenceOf("Er wäscht sich."),
			unit: unitOf([2], "Lexeme/VERB"),
		},
	);
	expect(attested(wash.result).surface.lemma.canonicalForm).toBe("waschen");
	expect(wash.trace?.events).toEqual([
		{
			name: "CanonicalRewritten",
			data: { reason: "jev judged the verb not lexically reflexive" },
		},
	]);
	// Sie0 _1 zankt2 _3 sich4 _5 mit6 _7 ihm8 .9
	const quarrels = writesOnGuess("sich mitzanken", "sich zanken");
	const quarrel = await resolveOnce(
		{
			jev: fakeJev({
				prefix: "None",
				reflexive: "Acc",
				governed_m2: "Free",
			}).ask,
			luna: quarrels.ask,
		},
		{
			sentence: sentenceOf("Sie zankt sich mit ihm."),
			unit: unitOf([2, 4, 6], "Lexeme/VERB"),
		},
	);
	expect(attested(quarrel.result).surface.lemma.canonicalForm).toBe(
		"sich zanken",
	);
	expect(quarrel.trace?.events).toEqual([
		{
			name: "CanonicalRewritten",
			data: { reason: "jev judged the verb without a separable prefix" },
		},
	]);
	// A guess that already fits stands: sich zanken is lexically reflexive.
	const fits = writesOnGuess("sich zanken", "never asked");
	await resolveOnce(
		{
			jev: fakeJev({
				prefix: "None",
				reflexive: "Acc",
				governed_m2: "Free",
			}).ask,
			luna: fits.ask,
		},
		{
			sentence: sentenceOf("Sie zankt sich mit ihm."),
			unit: unitOf([2, 4, 6], "Lexeme/VERB"),
		},
	);
	expect(fits.sent).toHaveLength(1);
});

test("a failed or Unresolved grammar request ends the guessed call before the trace is emitted", async () => {
	const traces: OperationTrace[] = [];
	const down = fakeLuna(undefined, { delayMs: 50 });
	const failure = await Effect.runPromise(
		Effect.flip(
			createDumgen({
				jev: fakeJev({}, { fail: () => true }).ask,
				luna: down.ask,
				onOperation: (trace) => traces.push(trace),
			}).resolve.grammar({
				language: "de",
				neighbours: {},
				lemmaCandidates: [],
				sentence: sentenceOf("Er kommt."),
				unit: unitOf([2], "Lexeme/VERB"),
			}),
		),
	);
	expect(failure).toBeInstanceOf(ProviderFailure);
	expect(down.aborted).toEqual(["canonical"]);
	expect(
		traces[0]?.calls.map(({ stage, failure }) => [stage, failure?.tag]),
	).toEqual([
		["canonical", "Interrupted"],
		["grammar", "ProviderFailure"],
	]);
	const slow = fakeLuna(undefined, { delayMs: 50 });
	const { result, trace } = await resolveOnce(
		{ jev: fakeJev({ orthography: "Unresolved" }).ask, luna: slow.ask },
		{
			sentence: sentenceOf("Er kommt."),
			unit: unitOf([2], "Lexeme/VERB"),
		},
	);
	expect(result).toEqual({ _tag: "Unresolved" });
	expect(slow.aborted).toEqual(["canonical"]);
	expect(
		trace?.calls.map(({ stage, failure }) => [stage, failure?.tag]),
	).toEqual([
		["canonical", "Interrupted"],
		["grammar", undefined],
	]);
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
			jev: fakeJev({ orthography: "t2" }).ask,
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
			createDumgen({
				jev: fakeJev({ orthography: "t2" }).ask,
				luna: writes("hereinkommen", ["komm", "doch"]).ask,
			}).resolve.grammar({
				language: "de",
				sentence: sentenceOf("Komm doch herrein."),
				unit: unitOf([0, 2, 4], "Lexeme/VERB"),
				neighbours: {},
				lemmaCandidates: [],
			}),
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
