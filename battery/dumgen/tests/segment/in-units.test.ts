import { expect, test } from "bun:test";
import { testEffect } from "common-utils/effect-test";
import { splitText } from "dumtext";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { z } from "zod";
import type { OperationTrace } from "../../src/operation-trace.js";
import { operations } from "../../src/operations.js";
import type { Answer } from "../../src/segment/ask.js";
import {
	checkedRouteKey,
	keyOf,
	routeForKey,
} from "../../src/segment/de/routes.js";
import {
	estimatedTokens,
	type JevAsk,
	pinnedJevModel,
	tokensPerRequest,
} from "../../src/segment/jev.js";
import type { Route } from "../../src/segment/segmented-sentence.js";
import { liveOver } from "../live-over.js";
import wirGehenLos from "./fixtures/in-units-lab-answers/wir-gehen-los-wenn-der-regen-aufhoert.json";
import wirSolltenDas from "./fixtures/in-units-lab-answers/wir-sollten-das-in-betracht-ziehen.json";
import woKommstDu from "./fixtures/in-units-lab-answers/wo-kommst-du-her.json";
import zeitIstGeld from "./fixtures/in-units-lab-answers/zeit-ist-geld.json";
import memberChecks from "./fixtures/in-units-member-check-answers.json";
import { fakeJev, inUnits, noLuna, picked } from "./in-units-support.js";

/** The four recorded Sentences, one file each, all from one lab run. */
const fixture = {
	recordedFrom: wirGehenLos.recordedFrom,
	sentences: [wirGehenLos, wirSolltenDas, woKommstDu, zeitIstGeld],
};

const probabilities = z.record(z.string(), z.number());
/** A jev answer as the fixture records it. */
const answer = z.discriminatedUnion("type", [
	z.object({ type: z.literal("noul"), noul: z.number() }),
	z.object({
		type: z.literal("choice"),
		choice: z.string(),
		confidence: z.number(),
		probabilities,
	}),
	z.object({
		type: z.literal("score"),
		score: z.number(),
		confidence: z.number(),
		probabilities,
	}),
]) satisfies z.ZodType<Answer>;

/**
 * Four dev Sentences with the cached jev answers each request got in the
 * lab's candidates4 maxim+closed run, and the units production returns
 * from them: that run's own, except Wo kommst du her?, which X3's
 * split-adverb rule (#851) cuts into [Wo, her] and [kommst]. Its new group's
 * route-extra answer comes from the lab cache's 2026-10-02 dev fill, and so
 * does X4's government answer for in Betracht ziehen (an idiom, unchanged).
 * Its member check's two answers (both members fixed, the unit unchanged)
 * come from #1325's 2026-11-10 dev fill, repetition 0, and are kept apart
 * in `in-units-member-check-answers.json`; each Sentence's calls take them in.
 * The adjective tests (`ta_…`) were re-recorded from the 2026-11-11 dev
 * fill, repetition 0, at #1340's reworded test (#1341).
 */
const recorded = z
	.object({
		recordedFrom: z.object({ model: z.string() }),
		sentences: z.array(
			z.object({
				text: z.string(),
				calls: z.array(
					z.object({
						stage: z.string(),
						answers: z.record(z.string(), answer),
					}),
				),
				units: z.array(
					z.object({
						segments: z.array(z.number()),
						// A recorded route is a German one: its key names it.
						route: z
							.object({ family: z.string(), kind: z.string() })
							.transform((route) =>
								routeForKey(checkedRouteKey(keyOf(route))),
							),
					}),
				),
			}),
		),
	})
	.parse({
		...fixture,
		sentences: fixture.sentences.map((sentence) => ({
			...sentence,
			calls: [
				...sentence.calls,
				...(memberChecks.sentences.find(
					(added) => added.text === sentence.text,
				)?.calls ?? []),
			],
		})),
	});

test("inUnits segments each Sentence of each paragraph and routes its units", async () => {
	const jev = fakeJev({
		answers: {
			s_particle_3: picked("p2"),
			r_1: picked("Lexeme/PRON"),
			r_2_3: picked("Lexeme/VERB"),
		},
	});
	const { text, traces } = await inUnits(
		{ jev: jev.ask },
		{ language: "de", ...splitText("Er  gibt auf.\n\nJa!") },
	);
	expect(text.language).toBe("de");
	const [first, second] = text.paragraphs;
	const sentence = first?.sentences[0];
	// The Stitched Text, whose Segments give it back.
	expect(sentence?.text).toBe("Er gibt auf.");
	expect(sentence?.segments.map((segment) => segment.text).join("")).toBe(
		"Er gibt auf.",
	);
	expect(sentence?.units).toEqual([
		{
			segments: [0],
			route: { language: "de", family: "Lexeme", kind: "PRON" },
			identity: { kind: "PRON", canonicalForm: "er", pronType: "Prs" },
		},
		{
			segments: [2, 4],
			route: { language: "de", family: "Lexeme", kind: "VERB" },
		},
	]);
	expect(sentence).not.toHaveProperty("failed");
	expect(second?.sentences.map(({ text }) => text)).toEqual(["Ja!"]);
	// Every request names the pinned model.
	expect(new Set(jev.sent.map(({ model }) => model))).toEqual(
		new Set([pinnedJevModel]),
	);
	// The host hears of the operation once, with every call and outcome.
	expect(traces).toHaveLength(1);
	const [trace] = traces;
	expect(trace?.operation).toBe("segment.inUnits");
	expect(trace?.calls).toHaveLength(jev.sent.length);
	expect(
		trace?.calls.find(({ stage }) =>
			stage.split("+").includes("candidates"),
		),
	).toMatchObject({ sentence: 0, executor: "jev", outputTokens: 1 });
	expect(trace?.calls.every(({ failure }) => failure === undefined)).toBe(
		true,
	);
	expect(trace?.calls.every(({ payload }) => payload === undefined)).toBe(
		true,
	);
	expect(
		[...(trace?.sentences ?? [])].sort((a, b) => a.sentence - b.sentence),
	).toEqual([
		{ sentence: 0, outcome: "Segmented" },
		{ sentence: 1, outcome: "Segmented" },
	]);
	expect(trace?.waits).toEqual([]);
});

test("a request over its token size goes out in chunks of at most tokensPerRequest estimated tokens, in order, its answers merged, under the request budget", async () => {
	const words = Array.from({ length: 160 }, (_, index) => `wort${index}`);
	const jev = fakeJev();
	const { text, traces } = await inUnits(
		{ jev: jev.ask, requestBudget: 2 },
		{
			language: "de",
			paragraphs: [{ sentences: [`${words.join(" ")}.`] }],
		},
	);
	const [sentence] = text.paragraphs[0]?.sentences ?? [];
	expect(sentence?.failed).toBeUndefined();
	expect(sentence?.units).toHaveLength(160);
	const route = jev.sent.filter(({ stage }) => stage === "route");
	expect(route.length).toBeGreaterThan(1);
	const ids = route.flatMap(({ questions }) => Object.keys(questions));
	expect(new Set(ids).size).toBe(ids.length);
	expect(ids.slice(0, 2)).toEqual(["r_1", "ta_1"]);
	expect(ids.at(-1)).toBe("ta_160");
	for (const { state, questions } of jev.sent)
		expect(
			estimatedTokens(state) +
				Object.entries(questions).reduce(
					(sum, entry) => sum + estimatedTokens(entry),
					0,
				),
		).toBeLessThanOrEqual(tokensPerRequest);
	expect(jev.mostInFlight()).toBeLessThanOrEqual(2);
	expect(
		traces[0]?.calls
			.filter(({ stage }) => stage === "route")
			.map(({ inputTokens }) => inputTokens),
	).toEqual(route.map(({ questions }) => 10 * Object.keys(questions).length));
});

test("a Sentence the Text holds twice is asked about once, and each occurrence gets its units, outcome and events", async () => {
	const jev = fakeJev({
		answers: { r_1: picked("Lexeme/PRON"), r_2: picked("Lexeme/VERB") },
	});
	const { text, traces } = await inUnits(
		{ jev: jev.ask },
		{
			language: "de",
			paragraphs: [
				{ sentences: ["Er kam.", "Sie ging."] },
				{ sentences: ["Er kam."] },
			],
		},
	);
	const [first, other] = text.paragraphs[0]?.sentences ?? [];
	const [again] = text.paragraphs[1]?.sentences ?? [];
	expect(again).toEqual(first);
	expect(other?.text).toBe("Sie ging.");
	expect(first?.units.map(({ route }) => route)).toEqual([
		{ language: "de", family: "Lexeme", kind: "PRON" },
		{ language: "de", family: "Lexeme", kind: "VERB" },
	]);
	const [trace] = traces;
	// Er kam. was asked about once, its calls under its first index: as
	// often as a Text holding it alone asks.
	const kam = jev.sent.filter(({ state }) =>
		JSON.stringify(state).includes("Er kam"),
	);
	expect(new Set(trace?.calls.map(({ sentence }) => sentence))).toEqual(
		new Set([0, 1]),
	);
	expect(
		[...(trace?.sentences ?? [])].sort((a, b) => a.sentence - b.sentence),
	).toEqual([
		{ sentence: 0, outcome: "Segmented" },
		{ sentence: 1, outcome: "Segmented" },
		{ sentence: 2, outcome: "Segmented" },
	]);
	const once = fakeJev();
	await inUnits(
		{ jev: once.ask },
		{ language: "de", paragraphs: [{ sentences: ["Er kam."] }] },
	);
	expect(kam.length).toBe(once.sent.length);
});

test("one request budget bounds every Sentence's calls together, and each wait is recorded", async () => {
	const jev = fakeJev();
	const { traces } = await inUnits(
		{ jev: jev.ask, requestBudget: 1 },
		{
			language: "de",
			paragraphs: [
				{ sentences: ["Der Hund bellt.", "Die Katze schläft."] },
				{ sentences: ["Er kam."] },
			],
		},
	);
	expect(jev.mostInFlight()).toBe(1);
	const [trace] = traces;
	if (!trace) throw Error("A trace expected");
	// Three Sentences start together, so all but the first call queue at once.
	expect(trace.waits.length).toBeGreaterThan(0);
	for (const wait of trace.waits) {
		expect(trace.calls[wait.call]).toBeDefined();
		expect(wait.waitMs).toBeGreaterThanOrEqual(0);
	}
	expect(new Set(trace.calls.map(({ sentence }) => sentence))).toEqual(
		new Set([0, 1, 2]),
	);
});

test("with payloads asked for, each call's trace keeps its request and answer", async () => {
	const { traces } = await inUnits(
		{ jev: fakeJev().ask, tracePayloads: true },
		{ language: "de", paragraphs: [{ sentences: ["Er kam."] }] },
	);
	const [call] = traces[0]?.calls ?? [];
	expect(call?.payload?.request).toMatchObject({
		model: pinnedJevModel,
		state: expect.any(Object),
		questions: expect.any(Object),
	});
	expect(call?.payload?.response).toMatchObject({ model: pinnedJevModel });
});

testEffect(
	"another language or a blank Sentence is a Defect before anything is asked, and a floating model is refused",
	() =>
		Effect.gen(function* () {
			const jev = fakeJev();
			const traces: OperationTrace[] = [];
			const live = liveOver({
				jev: jev.ask,
				luna: noLuna,
				onOperation: (trace) => traces.push(trace),
			});
			const expectDefect = <A, E>(
				effect: Effect.Effect<A, E>,
				expectedMessage: string,
			) =>
				Effect.gen(function* () {
					const exit = yield* Effect.exit(effect);
					expect(Exit.isFailure(exit)).toBe(true);
					if (Exit.isFailure(exit)) {
						const err = Cause.squash(exit.cause);
						expect(
							err instanceof Error ? err.message : String(err),
						).toContain(expectedMessage);
					}
				});

			yield* expectDefect(
				operations.segment
					.inUnits({
						language: "en" as "de",
						paragraphs: [{ sentences: ["Hello."] }],
					})
					.pipe(Effect.provide(live)),
				'German ("de") only, not "en"',
			);
			yield* expectDefect(
				operations.segment
					.inUnits({
						language: "de",
						paragraphs: [{ sentences: ["Gut.", " \t "] }],
					})
					.pipe(Effect.provide(live)),
				"Sentence 1 of paragraph 0 is blank",
			);
			expect(jev.sent).toEqual([]);
			// Each failed operation still reports its (empty) trace.
			expect(traces.map(({ calls }) => calls.length)).toEqual([0, 0]);
			const once = operations.segment.inUnits({
				language: "de",
				paragraphs: [{ sentences: ["Er kam."] }],
			});
			yield* expectDefect(
				once.pipe(
					Effect.provide(
						liveOver({
							jev: jev.ask,
							luna: noLuna,
							jevModel: "jev-latest",
						}),
					),
				),
				"floats between jev versions",
			);
			yield* expectDefect(
				once.pipe(
					Effect.provide(
						liveOver({
							jev: jev.ask,
							luna: noLuna,
							requestBudget: 0,
						}),
					),
				),
				"requestBudget",
			);
		}),
);

testEffect(
	"an exception from onOperation is the host's, and inUnits passes it on",
	() =>
		Effect.gen(function* () {
			const exit = yield* Effect.exit(
				operations.segment
					.inUnits({
						language: "de",
						paragraphs: [{ sentences: ["Er kam."] }],
					})
					.pipe(
						Effect.provide(
							liveOver({
								jev: fakeJev().ask,
								luna: noLuna,
								onOperation: () => {
									throw Error("ledger is full");
								},
							}),
						),
					),
			);
			expect(Exit.isFailure(exit)).toBe(true);
			if (Exit.isFailure(exit)) {
				const err = Cause.squash(exit.cause);
				expect(
					err instanceof Error ? err.message : String(err),
				).toContain("ledger is full");
			}
		}),
);

test("routes are Dumling's: a Kind belongs to its Family", () => {
	const routes: Route[] = [
		{ language: "de", family: "Locution", kind: "ADV" },
		{ language: "de", family: "Saying", kind: "Saying" },
		{ language: "de", family: "Foreign", kind: "Foreign" },
	];
	// @ts-expect-error A Saying has no VERB Kind.
	routes.push({ language: "de", family: "Saying", kind: "VERB" });
	// @ts-expect-error A biggest unit never routes to a Morpheme.
	routes.push({ language: "de", family: "Morpheme", kind: "Root" });
	// @ts-expect-error German only.
	routes.push({ language: "en", family: "Lexeme", kind: "NOUN" });
	expect(routes).toHaveLength(6);
});

test("cached lab answers replay through inUnits to the lab's own units", async () => {
	const identities: unknown[] = [];
	for (const sentence of recorded.sentences) {
		const { calls } = sentence;
		const sent: string[] = [];
		// A request may ask for several stages at once: each question is
		// answered from the lab's call of one of them.
		const ask: JevAsk = async (request, { stage }) => {
			sent.push(stage);
			const stages = stage.split("+");
			const answers = Object.fromEntries(
				Object.keys(request.questions).map((id) => {
					const answer = calls.find(
						(call) =>
							stages.includes(call.stage) && id in call.answers,
					)?.answers[id];
					if (!answer)
						throw Error(`No recorded ${stage} answer ${id}`);
					return [id, answer];
				}),
			);
			return {
				model: recorded.recordedFrom.model,
				answers,
				usage: { input_tokens: 0, output_tokens: 0 },
			};
		};
		const { text, traces } = await inUnits(
			{ jev: ask, jevModel: recorded.recordedFrom.model },
			{ language: "de", paragraphs: [{ sentences: [sentence.text] }] },
		);
		const [result] = text.paragraphs[0]?.sentences ?? [];
		expect(result?.failed).toBeUndefined();
		expect(traces[0]?.events).toBeUndefined();
		// The lab recorded no closed-class identity; production adds it (#864).
		expect(
			result?.units.map(({ identity: _identity, ...unit }) => unit),
		).toEqual([...sentence.units]);
		identities.push(
			...(result?.units ?? []).flatMap((unit) =>
				unit.identity
					? [
							{
								word: unit.segments
									.map(
										(index) =>
											result?.segments[index]?.text,
									)
									.join(" "),
								route:
									unit.route === "Unresolved"
										? unit.route
										: unit.route.kind,
								identity: unit.identity,
							},
						]
					: [],
			),
		);
		// Every stage the lab asked is asked once, alone or with others.
		expect(sent.flatMap((stage) => stage.split("+")).sort()).toEqual(
			calls.map(({ stage }) => stage).sort(),
		);
	}
	// Each one-piece PRON keeps the identity its identity Choice picked.
	expect(identities).toEqual([
		{ word: "Wir", route: "PRON", identity: wir },
		{ word: "Wir", route: "PRON", identity: wir },
		{
			word: "das",
			route: "PRON",
			identity: { kind: "PRON", canonicalForm: "das", pronType: "Dem" },
		},
		{
			word: "du",
			route: "PRON",
			identity: { kind: "PRON", canonicalForm: "du", pronType: "Prs" },
		},
	]);
});

const wir = { kind: "PRON", canonicalForm: "wir", pronType: "Prs" };
