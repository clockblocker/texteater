import { expect, test } from "bun:test";
import type { Question } from "promptsmith/typesafe";
import type { Answer, Answers } from "../../src/segment/ask.js";
import { createSegment, type SegmentCall } from "../../src/segment/in-units.js";
import {
	type JevAsk,
	type JevRequest,
	pinnedJevModel,
} from "../../src/segment/jev.js";
import type {
	Route,
	SegmentedSentence,
	Unit,
} from "../../src/segment/segmented-sentence.js";
import { splitText } from "../../src/segment/split-text.js";
import fixture from "./fixtures/in-units-lab-answers.json";

/**
 * Four dev Sentences with the cached jev answers each request got in the
 * lab's candidates4 maxim+closed run, and the units production returns
 * from them: that run's own, except Wo kommst du her?, which X3's
 * split-adverb rule (#851) cuts into [Wo, her] and [kommst]. Its new group's
 * route-extra answer comes from the lab cache's 2026-10-02 dev fill.
 */
const recorded = fixture as unknown as {
	readonly recordedFrom: { readonly model: string };
	readonly sentences: readonly {
		readonly text: string;
		readonly calls: readonly {
			readonly stage: string;
			readonly answers: Answers;
		}[];
		readonly units: readonly Unit[];
	}[];
};

type Sent = JevRequest & { readonly stage: string };

/**
 * A jev that answers by question id from `answers` and otherwise says no:
 * a Noul 0.1, a Choice its last option (`none`, `Other`, …). `fail` makes a
 * stage's requests throw.
 */
function fakeJev(
	options: {
		readonly answers?: Readonly<Record<string, Answer>>;
		readonly fail?: (stage: string, request: JevRequest) => boolean;
		readonly model?: string;
		readonly drop?: (id: string) => boolean;
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
			else if (question.type === "noul")
				answers[id] = { type: "noul", noul: 0.1 };
			else {
				const keys = Object.keys(
					question.type === "choice" ? question.criteria : {},
				);
				const choice = keys.at(-1) ?? "";
				answers[id] = {
					type: "choice",
					choice,
					confidence: 1,
					probabilities: { [choice]: 1 },
				};
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

const resolvable = (sentence: SegmentedSentence) =>
	sentence.segments.flatMap((segment, index) =>
		segment.kind === "ResolvableText" ? [index] : [],
	);

const allUnresolved = (sentence: SegmentedSentence): Unit[] =>
	resolvable(sentence).map((index) => ({
		segments: [index],
		route: "Unresolved",
	}));

test("inUnits segments each Sentence of each paragraph and routes its units", async () => {
	const jev = fakeJev({
		answers: {
			s_particle_3: picked("p2"),
			r_1: picked("Lexeme/PRON"),
			r_2_3: picked("Lexeme/VERB"),
		},
	});
	const calls: SegmentCall[] = [];
	const text = await createSegment({
		ask: jev.ask,
		onCall: (call) => calls.push(call),
	}).inUnits({
		language: "de",
		...splitText("Er  gibt auf.\n\nJa!"),
	});
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
	expect(sentence).not.toHaveProperty("failure");
	expect(second?.sentences.map(({ text }) => text)).toEqual(["Ja!"]);
	// Every request names the pinned model, and the host hears of each one.
	expect(new Set(jev.sent.map(({ model }) => model))).toEqual(
		new Set([pinnedJevModel]),
	);
	expect(calls).toHaveLength(jev.sent.length);
	expect(calls.find(({ stage }) => stage === "candidates")).toMatchObject({
		paragraph: 0,
		sentence: 0,
		model: pinnedJevModel,
		outputTokens: 1,
	});
	expect(calls.every(({ error }) => error === undefined)).toBe(true);
});

test("a request over 300 questions goes out in chunks of 300, in order, and their answers merge", async () => {
	const words = Array.from({ length: 160 }, (_, index) => `wort${index}`);
	const jev = fakeJev();
	const calls: SegmentCall[] = [];
	const [sentence] =
		(
			await createSegment({
				ask: jev.ask,
				onCall: (call) => calls.push(call),
				concurrency: 2,
			}).inUnits({
				language: "de",
				paragraphs: [{ sentences: [`${words.join(" ")}.`] }],
			})
		).paragraphs[0]?.sentences ?? [];
	expect(sentence?.failure).toBeUndefined();
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
		calls
			.filter(({ stage }) => stage === "route")
			.map(({ questions, inputTokens }) => [questions, inputTokens]),
	).toEqual([
		[300, 3000],
		[20, 200],
	]);
});

test("a Sentence whose jev request fails falls back to one Unresolved unit per ResolvableText, and the Text goes on", async () => {
	const jev = fakeJev({
		fail: (stage, request) =>
			stage === "route" && JSON.stringify(request.state).includes("Hund"),
	});
	const calls: SegmentCall[] = [];
	const text = await createSegment({
		ask: jev.ask,
		onCall: (call) => calls.push(call),
	}).inUnits({
		language: "de",
		paragraphs: [{ sentences: ["Der Hund bellt.", "Die Katze schläft."] }],
	});
	const [failed, fine] = text.paragraphs[0]?.sentences ?? [];
	if (!failed || !fine) throw Error("Two Sentences expected");
	expect(failed.failure).toBe("route: jev is down");
	expect(failed.units).toEqual(allUnresolved(failed));
	expect(failed.units).toHaveLength(3);
	expect(fine.failure).toBeUndefined();
	expect(fine.units.some(({ route }) => route !== "Unresolved")).toBe(true);
	expect(calls.filter(({ error }) => error !== undefined)).toEqual([
		expect.objectContaining({
			sentence: 0,
			stage: "route",
			inputTokens: 0,
			error: "jev is down",
		}),
	]);
});

test("a failed Segment stage keeps each written word whole", async () => {
	const jev = fakeJev({ fail: (stage) => stage === "segments" });
	const [sentence] =
		(
			await createSegment({ ask: jev.ask }).inUnits({
				language: "de",
				paragraphs: [{ sentences: ["Er ist im  Haus."] }],
			})
		).paragraphs[0]?.sentences ?? [];
	if (!sentence) throw Error("A Sentence expected");
	expect(sentence.failure).toBe("segments: jev is down");
	expect(sentence.text).toBe("Er ist im Haus.");
	expect(sentence.segments).toContainEqual({
		kind: "ResolvableText",
		text: "im",
	});
	expect(sentence.units).toEqual(allUnresolved(sentence));
	expect(jev.sent.map(({ stage }) => stage)).toEqual(["segments"]);
});

test("an answer from an unpinned model, or one missing an answer, fails its Sentence and still reports its tokens", async () => {
	const calls: SegmentCall[] = [];
	const other = await createSegment({
		ask: fakeJev({ model: "jev-9.9.9" }).ask,
		onCall: (call) => calls.push(call),
	}).inUnits({ language: "de", paragraphs: [{ sentences: ["Er kam."] }] });
	expect(other.paragraphs[0]?.sentences[0]?.failure).toBe(
		`candidates: jev answered as jev-9.9.9, not the pinned ${pinnedJevModel}`,
	);
	expect(calls[0]).toMatchObject({ model: "jev-9.9.9", outputTokens: 1 });
	expect(calls[0]?.inputTokens).toBeGreaterThan(0);

	const missing = await createSegment({
		ask: fakeJev({ drop: (id) => id.startsWith("r_") }).ask,
	}).inUnits({ language: "de", paragraphs: [{ sentences: ["Er kam."] }] });
	expect(missing.paragraphs[0]?.sentences[0]?.failure).toStartWith(
		"route: jev answered without r_",
	);
});

test("inUnits rejects another language and a blank Sentence before asking, and createSegment a floating model", async () => {
	const jev = fakeJev();
	const segment = createSegment({ ask: jev.ask });
	await expect(
		segment.inUnits({
			language: "en" as "de",
			paragraphs: [{ sentences: ["Hello."] }],
		}),
	).rejects.toThrow('German ("de") only, not "en"');
	await expect(
		segment.inUnits({
			language: "de",
			paragraphs: [{ sentences: ["Gut.", " \t "] }],
		}),
	).rejects.toThrow("Sentence 1 of paragraph 0 is blank");
	expect(jev.sent).toEqual([]);
	expect(() => createSegment({ ask: jev.ask, model: "jev-latest" })).toThrow(
		"floats between jev versions",
	);
});

test("an exception from onCall is the host's, and inUnits passes it on", async () => {
	await expect(
		createSegment({
			ask: fakeJev().ask,
			onCall: () => {
				throw Error("ledger is full");
			},
		}).inUnits({
			language: "de",
			paragraphs: [{ sentences: ["Er kam."] }],
		}),
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
		const [result] =
			(
				await createSegment({ ask }).inUnits({
					language: "de",
					paragraphs: [{ sentences: [sentence.text] }],
				})
			).paragraphs[0]?.sentences ?? [];
		expect(result?.failure).toBeUndefined();
		expect(result?.units).toEqual([...sentence.units]);
		expect(sent).toEqual(calls.map(({ stage }) => stage));
	}
});
