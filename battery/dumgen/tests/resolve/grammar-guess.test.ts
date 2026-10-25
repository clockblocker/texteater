import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { ProviderFailure } from "../../src/errors.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import { operations } from "../../src/operations.js";
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
