import { expect, test } from "bun:test";
import type { JevAsk } from "../../src/segment/jev.js";
import { pinnedJevModel } from "../../src/segment/jev.js";
import { fakeJev, inUnits, picked } from "./in-units-support.js";

test("a Sentence whose nomination request fails is marked failed with no units, its siblings are kept, and only the trace says why", async () => {
	const nominating = (stage: string) =>
		stage.split("+").includes("candidates");
	const jev = fakeJev({
		fail: (stage, request) =>
			nominating(stage) && JSON.stringify(request.state).includes("Hund"),
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
				stage: "candidates+final",
				inputTokens: 0,
				failure: { tag: "ProviderFailure", message: "jev is down" },
			}),
		],
	);
	// The failed request was sent once: nothing is retried.
	expect(
		jev.sent.filter(
			({ stage, state }) =>
				nominating(stage) && JSON.stringify(state).includes("Hund"),
		),
	).toHaveLength(1);
});

test("a late request that fails degrades its stages instead: the grouping stays, its routes go Unresolved, the trace says which and why, and nothing is asked again", async () => {
	const answers = {
		s_particle_3: picked("p2"),
		r_1: picked("Lexeme/PRON"),
		r_2_3: picked("Lexeme/VERB"),
	};
	const jev = fakeJev({
		answers,
		fail: (stage) => stage.split("+").includes("route"),
	});
	const { text, traces } = await inUnits(
		{ jev: jev.ask },
		{ language: "de", paragraphs: [{ sentences: ["Er gibt auf."] }] },
	);
	const [sentence] = text.paragraphs[0]?.sentences ?? [];
	expect(sentence?.failed).toBeUndefined();
	// The particle still joins its verb; neither unit has a route.
	expect(sentence?.units).toEqual([
		{ segments: [0], route: "Unresolved" },
		{ segments: [2, 4], route: "Unresolved" },
	]);
	const [trace] = traces;
	expect(trace?.sentences).toEqual([{ sentence: 0, outcome: "Segmented" }]);
	expect(trace?.events).toEqual([
		{
			name: "DegradedStages",
			data: {
				sentence: 0,
				stages: [
					{
						stage: "route",
						failure: {
							tag: "ProviderFailure",
							message: "jev is down",
						},
					},
				],
			},
		},
	]);
	// No group the failed request asked about is asked again (route-extra).
	expect(jev.sent.map(({ stage }) => stage)).toEqual([
		"candidates+final",
		"route",
	]);
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
	let chunks = 0;
	const first = (stage: string) => stage.split("+").includes("candidates");
	const ask: JevAsk = (request, context) => {
		if (!first(context.stage)) return jev.ask(request, context);
		// Chunks are sent in order, so the first fails and the rest hang.
		if (chunks++ === 0) return Promise.reject(Error("jev is down"));
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
	const calls = traces[0]?.calls.filter(({ stage }) => first(stage)) ?? [];
	const siblings = calls.length - 1;
	expect(siblings).toBeGreaterThan(0);
	expect(aborted).toHaveLength(siblings);
	// The siblings settled before the operation reported its trace.
	expect(settled).toHaveLength(siblings);
	expect(calls.map(({ failure }) => failure?.tag)).toEqual([
		"ProviderFailure",
		...Array(siblings).fill("Interrupted"),
	]);
});

test("an answer from an unpinned model, or one missing or mistyping an answer the grouping needs, fails its Sentence as InvalidModelOutput and keeps its tokens", async () => {
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
		{ jev: fakeJev({ drop: (id) => id.startsWith("f_") }).ask },
		{ language: "de", paragraphs: [{ sentences: ["Er kam."] }] },
	);
	expect(missing.traces[0]?.sentences[0]).toMatchObject({
		outcome: "Failed",
		failure: { tag: "InvalidModelOutput" },
	});
	const [missingFailure] = missing.traces[0]?.sentences ?? [];
	expect(
		missingFailure?.outcome === "Failed" && missingFailure.failure.message,
	).toStartWith("jev answered without f_");

	const mistyped = await inUnits(
		{ jev: fakeJev({ retype: (id) => id.startsWith("f_") }).ask },
		{ language: "de", paragraphs: [{ sentences: ["Er kam."] }] },
	);
	expect(mistyped.text.paragraphs[0]?.sentences[0]?.failed).toBe(true);
	expect(mistyped.traces[0]?.sentences[0]).toMatchObject({
		outcome: "Failed",
		failure: { tag: "InvalidModelOutput" },
	});
});
