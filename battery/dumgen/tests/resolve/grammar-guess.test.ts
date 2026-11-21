import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import * as Effect from "effect/Effect";
import { ProviderFailure } from "../../src/errors.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import { operations } from "../../src/operations.js";
import { canonicalOutputLimit } from "../../src/resolve/de/canonical-form.js";
import type { JevAsk } from "../../src/segment/jev.js";
import { liveOver } from "../live-over.js";
import {
	attested,
	fakeJev,
	fakeLuna,
	resolveOnce,
	sentenceOf,
	unitOf,
} from "./support.js";

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
	expect(luna.caps[0]).toBe(canonicalOutputLimit);
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

test("a verb headword written on the guess with a prefix jev judged away is written again, and a sich dropped", async () => {
	// Er0 _1 wäscht2 _3 sich4 .5: sich stays outside the unit, and no
	// Canonical Form holds one (ADR 0052).
	const washes = writesOnGuess("sich waschen", "never asked");
	const wash = await resolveOnce(
		{ jev: fakeJev().ask, luna: washes.ask },
		{
			sentence: sentenceOf("Er wäscht sich."),
			unit: unitOf([2], "Lexeme/VERB"),
		},
	);
	expect(attested(wash.result).surface.lemma.canonicalForm).toBe("waschen");
	expect(wash.trace?.events).toBeUndefined();
	// Sie0 _1 zankt2 _3 sich4 _5 mit6 _7 ihm8 .9
	const quarrels = writesOnGuess("sich mitzanken", "sich zanken");
	const quarrel = await resolveOnce(
		{
			jev: fakeJev({
				prefix: "None",
				governed_m2: "Free",
			}).ask,
			luna: quarrels.ask,
		},
		{
			sentence: sentenceOf("Sie zankt sich mit ihm."),
			unit: unitOf([2, 4, 6], "Lexeme/VERB"),
		},
	);
	expect(attested(quarrel.result).surface.lemma.canonicalForm).toBe("zanken");
	expect(quarrel.trace?.events).toEqual([
		{
			name: "CanonicalRewritten",
			data: { reason: "jev judged the verb without a separable prefix" },
		},
	]);
	// A guess that already fits stands, its sich dropped.
	const fits = writesOnGuess("sich zanken", "never asked");
	await resolveOnce(
		{
			jev: fakeJev({
				prefix: "None",
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

test("a VERB Lexeme's guess takes its haben satellite as an auxiliary and a preposition no prefix as governed, so Luna writes once", async () => {
	// Sie0 _1 hat2 _3 von4 _5 ihm6 _7 geträumt8 .9
	const dreams = writesOnGuess("träumen", "never asked");
	const { result, trace } = await resolveOnce(
		{
			jev: fakeJev({ aux_m0: "u0", governed_m1: "Governed" }).ask,
			luna: dreams.ask,
		},
		{
			sentence: sentenceOf("Sie hat von ihm geträumt."),
			unit: unitOf([2, 4, 8], "Lexeme/VERB"),
		},
	);
	expect(attested(result).surface.lemma.canonicalForm).toBe("träumen");
	expect(dreams.sent).toHaveLength(1);
	expect(dreams.sent[0]?.input).toMatchObject({
		auxiliaries: ["m0"],
		outsideHeadword: ["m1"],
	});
	expect(trace?.events).toBeUndefined();
	// A Locution's haben may be its own word, so its guess leaves it to jev.
	// Er0 _1 hat2 _3 Hunger4 .5
	const hungry = writesOnGuess("Hunger haben", "never asked");
	await resolveOnce(
		{ jev: fakeJev({ aux_m0: "Main" }).ask, luna: hungry.ask },
		{
			sentence: sentenceOf("Er hat Hunger."),
			unit: unitOf([2, 4], "Locution/VERB"),
		},
	);
	expect(hungry.sent).toHaveLength(1);
	expect(hungry.sent[0]?.input).not.toHaveProperty("auxiliaries");
});

test("any governing Lexeme (NOUN, ADJ, INTJ) guesses its governable preposition outsideHeadword, while Locutions leave it to jev", async () => {
	// Der0 _1 Geruch2 _3 von4 _5 Blumen6 .7
	const smell = fakeLuna((input) => ({
		canonicalForm: "judged" in input ? "never asked" : "Geruch",
		members: input.members.map(({ text }) => text),
		article: "der",
	}));
	const noun = await resolveOnce(
		{
			jev: fakeJev({
				number: "Sing",
				case: "Nom",
				governed_m2: "Governed",
			}).ask,
			luna: smell.ask,
		},
		{
			sentence: sentenceOf("Der Geruch von Blumen."),
			unit: unitOf([0, 2, 4], "Lexeme/NOUN"),
		},
	);
	expect(attested(noun.result).surface.lemma.canonicalForm).toBe("Geruch");
	expect(smell.sent).toHaveLength(1);
	expect(smell.sent[0]?.input).toMatchObject({
		outsideHeadword: ["m0", "m2"],
	});
	expect(noun.trace?.events).toBeUndefined();

	// If jev judges the guessed preposition Free, outsideHeadword shrinks and Luna rewrites.
	const freeNoun = fakeLuna((input) => ({
		canonicalForm: "judged" in input ? "Geruch" : "Geruch",
		members: input.members.map(({ text }) => text),
		article: "der",
	}));
	const shrunk = await resolveOnce(
		{
			jev: fakeJev({
				number: "Sing",
				case: "Nom",
				governed_m2: "Free",
			}).ask,
			luna: freeNoun.ask,
		},
		{
			sentence: sentenceOf("Der Geruch von Blumen."),
			unit: unitOf([0, 2, 4], "Lexeme/NOUN"),
		},
	);
	expect(freeNoun.sent).toHaveLength(2);
	expect(shrunk.trace?.events).toEqual([
		{
			name: "CanonicalRewritten",
			data: { reason: "jev changed what Luna reads" },
		},
	]);

	// Sie0 _1 ist2 _3 stolz4 _5 auf6 _7 ihn8 .9
	const proud = writesOnGuess("stolz", "never asked");
	const adj = await resolveOnce(
		{
			jev: fakeJev({
				governed_m1: "Governed",
				governedCase_m1: "Acc",
			}).ask,
			luna: proud.ask,
		},
		{
			sentence: sentenceOf("Sie ist stolz auf ihn."),
			unit: unitOf([4, 6], "Lexeme/ADJ"),
		},
	);
	expect(attested(adj.result).surface.lemma.canonicalForm).toBe("stolz");
	expect(proud.sent).toHaveLength(1);
	expect(proud.sent[0]?.input).toMatchObject({ outsideHeadword: ["m1"] });
	expect(adj.trace?.events).toBeUndefined();

	// Danke0 _1 für2 _3 alles4 .5
	const thanks = writesOnGuess("danke", "never asked");
	const intj = await resolveOnce(
		{
			jev: fakeJev({ governed_m1: "Governed" }).ask,
			luna: thanks.ask,
		},
		{
			sentence: sentenceOf("Danke für alles."),
			unit: unitOf([0, 2], "Lexeme/INTJ"),
		},
	);
	expect(attested(intj.result).surface.lemma.canonicalForm).toBe("danke");
	expect(thanks.sent).toHaveLength(1);
	expect(thanks.sent[0]?.input).toMatchObject({ outsideHeadword: ["m1"] });
	expect(intj.trace?.events).toBeUndefined();

	// Locution/VERB keeps its governed preposition out of guessed outsideHeadword.
	// Sie0 _1 nahm2 _3 Rücksicht4 _5 auf6 _7 ihn8 .9
	const care = writesOnGuess("Rücksicht nehmen", "never asked");
	await resolveOnce(
		{
			jev: fakeJev({
				governed_m2: "Governed",
				governedCase_m2: "Acc",
			}).ask,
			luna: care.ask,
		},
		{
			sentence: sentenceOf("Sie nahm Rücksicht auf ihn."),
			unit: unitOf([2, 4, 6], "Locution/VERB"),
		},
	);
	expect(care.sent).toHaveLength(1);
	expect(care.sent[0]?.input).not.toHaveProperty("outsideHeadword");
});

test("when jev only adds members to outsideHeadword, keep the guessed headword if it already omits those words, else rewrite", async () => {
	// Sie0 _1 warten2 _3 auf4 _5 ihn6 .7: auf may be a separable prefix, so
	// the guess leaves it inside the headword; jev then judges it Governed.
	const wait = {
		sentence: sentenceOf("Sie warten auf ihn."),
		unit: unitOf([2, 4], "Lexeme/VERB"),
	};

	// Guessed answer already omits "auf": keep it, no CanonicalRewritten.
	const clean = writesOnGuess("warten", "never asked");
	const kept = await resolveOnce(
		{
			jev: fakeJev({
				prefix: "None",
				governed_m1: "Governed",
				governedCase_m1: "Acc",
			}).ask,
			luna: clean.ask,
		},
		wait,
	);
	expect(attested(kept.result).surface.lemma.canonicalForm).toBe("warten");
	expect(attested(kept.result).surface.normalizedSurface).toBe("warten");
	expect(clean.sent).toHaveLength(1);
	expect(clean.sent[0]?.input).not.toHaveProperty("outsideHeadword");
	expect(kept.trace?.events).toBeUndefined();

	// Guessed answer included "auf" as a token: rewrite with jev's answers.
	const included = writesOnGuess("warten auf", "warten");
	const rewritten = await resolveOnce(
		{
			jev: fakeJev({
				prefix: "None",
				governed_m1: "Governed",
				governedCase_m1: "Acc",
			}).ask,
			luna: included.ask,
		},
		wait,
	);
	expect(attested(rewritten.result).surface.lemma.canonicalForm).toBe(
		"warten",
	);
	expect(included.sent).toHaveLength(2);
	expect(rewritten.trace?.events).toEqual([
		{
			name: "CanonicalRewritten",
			data: {
				reason: "jev excluded a member Luna wrote in the headword",
			},
		},
	]);

	// Guessed answer prefixed "auf" (aufwarten): verbMisses still forces a rewrite.
	const prefixed = writesOnGuess("aufwarten", "warten");
	const prefixRewritten = await resolveOnce(
		{
			jev: fakeJev({
				prefix: "None",
				governed_m1: "Governed",
				governedCase_m1: "Acc",
			}).ask,
			luna: prefixed.ask,
		},
		wait,
	);
	expect(attested(prefixRewritten.result).surface.lemma.canonicalForm).toBe(
		"warten",
	);
	expect(prefixed.sent).toHaveLength(2);
	expect(prefixRewritten.trace?.events).toEqual([
		{
			name: "CanonicalRewritten",
			data: { reason: "jev judged the verb without a separable prefix" },
		},
	]);

	// Orthography also changed (Typo on m0): interrupt and rewrite even when
	// the guessed answer would have omitted "auf".
	const slow = fakeLuna(
		(input) => ({
			canonicalForm: "warten",
			members: input.members.map(({ text }) => text),
		}),
		{ delayMs: 50 },
	);
	const typo = await resolveOnce(
		{
			jev: fakeJev({
				orthography: "t0",
				prefix: "None",
				governed_m1: "Governed",
				governedCase_m1: "Acc",
			}).ask,
			luna: slow.ask,
		},
		wait,
	);
	expect(slow.sent).toHaveLength(2);
	expect(slow.aborted).toEqual(["canonical"]);
	expect(typo.trace?.events).toEqual([
		{
			name: "CanonicalRewritten",
			data: { reason: "jev changed what Luna reads" },
		},
	]);

	// A candidate that matched only the newly-excluded preposition changes
	// lemmaCandidates between guess and judged, so Luna still rewrites.
	const aufmachen: Dumling.Lemma<"de"> = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "VERB",
		canonicalForm: "aufmachen",
		coreFeatures: { hasSepPrefix: "auf" },
	};
	const hinted = writesOnGuess("warten", "warten");
	const hintChanged = await resolveOnce(
		{
			jev: fakeJev({
				prefix: "None",
				governed_m1: "Governed",
				governedCase_m1: "Acc",
			}).ask,
			luna: hinted.ask,
		},
		{
			...wait,
			lemmaCandidates: [{ lemma: aufmachen, foundUnder: ["macht auf"] }],
		},
	);
	expect(hinted.sent).toHaveLength(2);
	expect(hintChanged.trace?.events).toEqual([
		{
			name: "CanonicalRewritten",
			data: { reason: "jev changed what Luna reads" },
		},
	]);
});

test("a failed or Unresolved grammar request ends the guessed call before the trace is emitted", async () => {
	const traces: OperationTrace[] = [];
	const down = fakeLuna(undefined, { delayMs: 50 });
	const failure = await Effect.runPromise(
		Effect.flip(
			operations.resolve
				.grammar({
					language: "de",
					neighbours: {},
					lemmaCandidates: [],
					sentence: sentenceOf("Er kommt."),
					unit: unitOf([2], "Lexeme/VERB"),
				})
				.pipe(
					Effect.provide(
						liveOver({
							jev: fakeJev({}, { fail: () => true }).ask,
							luna: down.ask,
							onOperation: (trace) => traces.push(trace),
						}),
					),
				),
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
