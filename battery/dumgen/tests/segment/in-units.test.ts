import { expect, test } from "bun:test";
import type { Question } from "@typesafe-ai/sdk";
import * as Effect from "effect/Effect";
import { z } from "zod";
import { createDumgen, type DumgenOptions } from "../../src/create-dumgen.js";
import type { LunaAsk } from "../../src/luna.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import type { Answer } from "../../src/segment/ask.js";
import { keyOf, routeForKey } from "../../src/segment/de/routes.js";
import {
	type JevAsk,
	type JevRequest,
	pinnedJevModel,
} from "../../src/segment/jev.js";
import type {
	Route,
	SegmentedText,
} from "../../src/segment/segmented-sentence.js";
import { splitText } from "../../src/segment/split-text.js";
import fixture from "./fixtures/in-units-lab-answers.json";

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
							.transform((route) => routeForKey(keyOf(route))),
					}),
				),
			}),
		),
	})
	.parse(fixture);

type Sent = JevRequest & { readonly stage: string };

/**
 * A jev that answers by question id from `answers` and otherwise says no:
 * a Noul 0.1, a Choice its last option (`none`, `Other`, …). `fail` makes a
 * stage's requests throw, and `retype` answers a question with the other
 * type.
 */
function fakeJev(
	options: {
		readonly answers?: Readonly<Record<string, Answer>>;
		readonly fail?: (stage: string, request: JevRequest) => boolean;
		readonly model?: string;
		readonly drop?: (id: string) => boolean;
		readonly retype?: (id: string) => boolean;
	} = {},
) {
	const sent: Sent[] = [];
	let inFlight = 0;
	let mostInFlight = 0;
	const ask: JevAsk = async (request, { stage }) => {
		sent.push({ ...request, stage });
		inFlight++;
		mostInFlight = Math.max(mostInFlight, inFlight);
		await new Promise((resolve) => setTimeout(resolve, 1));
		inFlight--;
		if (options.fail?.(stage, request)) throw Error("jev is down");
		const answers: Record<string, Answer> = {};
		for (const [id, question] of Object.entries(request.questions) as [
			string,
			Question,
		][]) {
			if (options.drop?.(id)) continue;
			const known = options.answers?.[id];
			if (known) answers[id] = known;
			else if (
				(question.type === "noul") !==
				(options.retype?.(id) ?? false)
			)
				answers[id] = { type: "noul", noul: 0.1 };
			else {
				const keys = Object.keys(
					question.type === "choice" ? question.criteria : {},
				);
				answers[id] = picked(keys.at(-1) ?? "");
			}
		}
		return {
			model: options.model ?? request.model,
			answers,
			usage: {
				input_tokens: 10 * Object.keys(request.questions).length,
				output_tokens: 1,
			},
		};
	};
	return { ask, sent, mostInFlight: () => mostInFlight };
}

const picked = (choice: string): Answer => ({
	type: "choice",
	choice,
	confidence: 1,
	probabilities: { [choice]: 1 },
});

/** Segmentation never reaches Luna; this one fails the test if it does. */
const noLuna: LunaAsk = async () => {
	throw Error("segmentation asked Luna");
};

/** Runs `segment.inUnits` once and keeps the traces it reported. */
async function inUnits(
	options: Omit<DumgenOptions, "luna">,
	input: Parameters<ReturnType<typeof createDumgen>["segment"]["inUnits"]>[0],
): Promise<{ text: SegmentedText; traces: OperationTrace[] }> {
	const traces: OperationTrace[] = [];
	const text = await Effect.runPromise(
		createDumgen({
			...options,
			luna: noLuna,
			onOperation: (trace) => traces.push(trace),
		}).segment.inUnits(input),
	);
	return { text, traces };
}

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
		trace?.calls.find(({ stage }) => stage === "candidates"),
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

test("a request over 300 questions goes out in chunks of 300, in order, its answers merged, under the request budget", async () => {
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
	expect(route.map(({ questions }) => Object.keys(questions).length)).toEqual(
		[300, 20],
	);
	const ids = route.flatMap(({ questions }) => Object.keys(questions));
	expect(new Set(ids).size).toBe(320);
	expect(ids.slice(0, 2)).toEqual(["r_1", "ta_1"]);
	expect(
		jev.sent.every(({ questions }) => Object.keys(questions).length <= 300),
	).toBe(true);
	expect(jev.mostInFlight()).toBeLessThanOrEqual(2);
	expect(
		traces[0]?.calls
			.filter(({ stage }) => stage === "route")
			.map(({ inputTokens }) => inputTokens),
	).toEqual([3000, 200]);
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

test("a Sentence whose jev request fails is marked failed with no units, its siblings are kept, and only the trace says why", async () => {
	const jev = fakeJev({
		fail: (stage, request) =>
			stage === "route" && JSON.stringify(request.state).includes("Hund"),
	});
	const { text, traces } = await inUnits(
		{ jev: jev.ask },
		{
			language: "de",
			paragraphs: [
				{ sentences: ["Der Hund bellt.", "Die Katze schläft."] },
			],
		},
	);
	const [failed, fine] = text.paragraphs[0]?.sentences ?? [];
	if (!failed || !fine) throw Error("Two Sentences expected");
	expect(failed).toEqual({
		text: "Der Hund bellt.",
		segments: [
			{ kind: "ResolvableText", text: "Der" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Hund" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "bellt" },
			{ kind: "Punctuation", text: "." },
		],
		units: [],
		failed: true,
	});
	expect(fine.failed).toBeUndefined();
	expect(fine.units.some(({ route }) => route !== "Unresolved")).toBe(true);
	const [trace] = traces;
	expect(trace?.sentences).toContainEqual({
		sentence: 0,
		outcome: "Failed",
		failure: { tag: "ProviderFailure", message: "jev is down" },
	});
	expect(trace?.sentences).toContainEqual({
		sentence: 1,
		outcome: "Segmented",
	});
	expect(trace?.calls.filter(({ failure }) => failure !== undefined)).toEqual(
		[
			expect.objectContaining({
				sentence: 0,
				stage: "route",
				inputTokens: 0,
				failure: { tag: "ProviderFailure", message: "jev is down" },
			}),
		],
	);
	// The failed request was sent once: nothing is retried.
	expect(
		jev.sent.filter(
			({ stage, state }) =>
				stage === "route" && JSON.stringify(state).includes("Hund"),
		),
	).toHaveLength(1);
});

test("a failed Segment stage keeps each written word whole", async () => {
	const jev = fakeJev({ fail: (stage) => stage === "segments" });
	const { text } = await inUnits(
		{ jev: jev.ask },
		{ language: "de", paragraphs: [{ sentences: ["Er ist im  Haus."] }] },
	);
	const [sentence] = text.paragraphs[0]?.sentences ?? [];
	if (!sentence) throw Error("A Sentence expected");
	expect(sentence.failed).toBe(true);
	expect(sentence.text).toBe("Er ist im Haus.");
	expect(sentence.segments).toContainEqual({
		kind: "ResolvableText",
		text: "im",
	});
	expect(sentence.units).toEqual([]);
	expect(jev.sent.map(({ stage }) => stage)).toEqual(["segments"]);
});

test("within a Sentence, a failed chunk interrupts its sibling chunks", async () => {
	const words = Array.from({ length: 160 }, (_, index) => `wort${index}`);
	const aborted: string[] = [];
	const settled: string[] = [];
	const jev = fakeJev();
	const ask: JevAsk = (request, context) => {
		if (context.stage !== "route") return jev.ask(request, context);
		const first = "r_1" in request.questions;
		if (first) return Promise.reject(Error("jev is down"));
		return new Promise((_, reject) =>
			context.signal.addEventListener("abort", () => {
				aborted.push(context.stage);
				setTimeout(() => {
					settled.push(context.stage);
					reject(Error("aborted"));
				}, 5);
			}),
		);
	};
	const { text, traces } = await inUnits(
		{ jev: ask },
		{
			language: "de",
			paragraphs: [{ sentences: [`${words.join(" ")}.`] }],
		},
	);
	expect(text.paragraphs[0]?.sentences[0]?.failed).toBe(true);
	expect(aborted).toEqual(["route"]);
	// The sibling settled before the operation reported its trace.
	expect(settled).toEqual(["route"]);
	expect(
		traces[0]?.calls
			.filter(({ stage }) => stage === "route")
			.map(({ failure }) => failure?.tag),
	).toEqual(["ProviderFailure", "Interrupted"]);
});

test("an answer from an unpinned model, or one missing or mistyping an answer, fails its Sentence as InvalidModelOutput and keeps its tokens", async () => {
	const other = await inUnits(
		{ jev: fakeJev({ model: "jev-9.9.9" }).ask },
		{ language: "de", paragraphs: [{ sentences: ["Er kam."] }] },
	);
	expect(other.text.paragraphs[0]?.sentences[0]?.failed).toBe(true);
	expect(other.traces[0]?.sentences).toEqual([
		{
			sentence: 0,
			outcome: "Failed",
			failure: {
				tag: "InvalidModelOutput",
				message: `jev answered as jev-9.9.9, not the pinned ${pinnedJevModel}`,
			},
		},
	]);
	expect(other.traces[0]?.calls[0]).toMatchObject({ outputTokens: 1 });
	expect(other.traces[0]?.calls[0]?.inputTokens).toBeGreaterThan(0);

	const missing = await inUnits(
		{ jev: fakeJev({ drop: (id) => id.startsWith("r_") }).ask },
		{ language: "de", paragraphs: [{ sentences: ["Er kam."] }] },
	);
	expect(missing.traces[0]?.sentences[0]).toMatchObject({
		outcome: "Failed",
		failure: { tag: "InvalidModelOutput" },
	});
	const [missingFailure] = missing.traces[0]?.sentences ?? [];
	expect(
		missingFailure?.outcome === "Failed" && missingFailure.failure.message,
	).toStartWith("jev answered without r_");

	const mistyped = await inUnits(
		{ jev: fakeJev({ retype: (id) => id.startsWith("r_") }).ask },
		{ language: "de", paragraphs: [{ sentences: ["Er kam."] }] },
	);
	expect(mistyped.text.paragraphs[0]?.sentences[0]?.failed).toBe(true);
	expect(mistyped.traces[0]?.sentences[0]).toMatchObject({
		outcome: "Failed",
		failure: { tag: "InvalidModelOutput" },
	});
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

test("another language or a blank Sentence is a Defect before anything is asked, and a floating model is refused", async () => {
	const jev = fakeJev();
	const traces: OperationTrace[] = [];
	const dumgen = createDumgen({
		jev: jev.ask,
		luna: noLuna,
		onOperation: (trace) => traces.push(trace),
	});
	await expect(
		Effect.runPromise(
			dumgen.segment.inUnits({
				language: "en" as "de",
				paragraphs: [{ sentences: ["Hello."] }],
			}),
		),
	).rejects.toThrow('German ("de") only, not "en"');
	await expect(
		Effect.runPromise(
			dumgen.segment.inUnits({
				language: "de",
				paragraphs: [{ sentences: ["Gut.", " \t "] }],
			}),
		),
	).rejects.toThrow("Sentence 1 of paragraph 0 is blank");
	expect(jev.sent).toEqual([]);
	// Each failed operation still reports its (empty) trace.
	expect(traces.map(({ calls }) => calls.length)).toEqual([0, 0]);
	expect(() =>
		createDumgen({ jev: jev.ask, luna: noLuna, jevModel: "jev-latest" }),
	).toThrow("floats between jev versions");
	expect(() =>
		createDumgen({ jev: jev.ask, luna: noLuna, requestBudget: 0 }),
	).toThrow("requestBudget");
});

test("an exception from onOperation is the host's, and inUnits passes it on", async () => {
	await expect(
		Effect.runPromise(
			createDumgen({
				jev: fakeJev().ask,
				luna: noLuna,
				onOperation: () => {
					throw Error("ledger is full");
				},
			}).segment.inUnits({
				language: "de",
				paragraphs: [{ sentences: ["Er kam."] }],
			}),
		),
	).rejects.toThrow("ledger is full");
});

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
		const ask: JevAsk = async (request, { stage }) => {
			sent.push(stage);
			const ids = Object.keys(request.questions);
			const answered = calls.find(
				(call) =>
					call.stage === stage &&
					ids.every((id) => id in call.answers),
			);
			if (!answered) throw Error(`No recorded ${stage} answer`);
			return {
				model: recorded.recordedFrom.model,
				answers: Object.fromEntries(
					ids.flatMap((id) => {
						const answer = answered.answers[id];
						return answer ? [[id, answer]] : [];
					}),
				),
				usage: { input_tokens: 0, output_tokens: 0 },
			};
		};
		const { text } = await inUnits(
			{ jev: ask },
			{ language: "de", paragraphs: [{ sentences: [sentence.text] }] },
		);
		const [result] = text.paragraphs[0]?.sentences ?? [];
		expect(result?.failed).toBeUndefined();
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
		expect(sent).toEqual(calls.map(({ stage }) => stage));
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
