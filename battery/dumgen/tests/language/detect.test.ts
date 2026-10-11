import { expect, test } from "bun:test";
import * as Effect from "effect/Effect";
import { createDumgen } from "../../src/create-dumgen.js";
import type { LunaAsk } from "../../src/luna.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import {
	type JevAsk,
	type JevRequest,
	pinnedJevModel,
} from "../../src/segment/jev.js";

const luna: LunaAsk = async () => {
	throw Error("language.detect never asks Luna");
};

/**
 * A jev that answers each Sentence's Choice from `choices`, by the
 * Sentence's text; a Sentence it has no answer for comes back Unknown.
 */
function fakeJev(choices: Readonly<Record<string, string>>) {
	const sent: JevRequest[] = [];
	const ask: JevAsk = async (request) => {
		sent.push(request);
		const sentences = request.state.sentences as string[];
		const answers = Object.fromEntries(
			Object.entries(request.questions).map(([id, question]) => {
				const index = Number(
					/`sentences\[(\d+)\]`/u.exec(
						String(question.instructions),
					)?.[1],
				);
				const choice = choices[sentences[index] ?? ""] ?? "Unknown";
				return [
					id,
					{
						type: "choice",
						choice,
						confidence: 0.9,
						probabilities: { [choice]: 0.95 },
					},
				];
			}),
		);
		return {
			model: pinnedJevModel,
			answers,
			usage: { input_tokens: 100, output_tokens: 0 },
		};
	};
	return { ask, sent };
}

const detect = (
	jev: JevAsk,
	paragraphs: readonly (readonly string[])[],
	onOperation?: (trace: OperationTrace) => void,
) =>
	Effect.runPromise(
		createDumgen({
			jev,
			luna,
			...(onOperation ? { onOperation } : {}),
		}).language.detect({
			paragraphs: paragraphs.map((sentences) => ({ sentences })),
		}),
	);

test("gives each Sentence the language jev picks, and Other for one Intake does not name", async () => {
	const jev = fakeJev({
		"Lies den Text.": "German",
		"Read the text.": "English",
		"Je ne sais pas.": "Other",
	});
	expect(
		await detect(jev.ask, [
			["Lies den Text.", "Read the text."],
			["Je ne sais pas."],
		]),
	).toEqual({
		paragraphs: [
			{
				sentences: [
					{ text: "Lies den Text.", language: "de" },
					{ text: "Read the text.", language: "en" },
				],
			},
			{ sentences: [{ text: "Je ne sais pas.", language: "other" }] },
		],
	});
});

test("code settles mostly-Hebrew and letterless Sentences without asking about them", async () => {
	const jev = fakeJev({ "Er sagte שלום.": "German" });
	const traces: OperationTrace[] = [];
	const text = await detect(
		jev.ask,
		[["אני גר ב-Tel Aviv.", "1984.", "Er sagte שלום."]],
		(trace) => traces.push(trace),
	);
	expect(
		text.paragraphs[0]?.sentences.map(({ language }) => language),
	).toEqual(["he", "he", "de"]);
	expect(jev.sent).toHaveLength(1);
	expect(Object.keys(jev.sent[0]?.questions ?? {})).toEqual(["sentence-2"]);
	// The state still shows every Sentence of the window, for context.
	expect(jev.sent[0]?.state).toEqual({
		sentences: ["אני גר ב-Tel Aviv.", "1984.", "Er sagte שלום."],
	});
	expect(traces[0]?.operation).toBe("language.detect");
	expect(traces[0]?.events?.[0]?.name).toBe("DetectedLanguages");
});

test("an undetermined Sentence takes the language before it, else after it, else none", async () => {
	const jev = fakeJev({ "Er kam.": "German", "He came.": "English" });
	const languages = async (sentences: readonly string[]) =>
		(await detect(jev.ask, [sentences])).paragraphs[0]?.sentences.map(
			({ language }) => language ?? null,
		);
	expect(await languages(["Hm.", "He came.", "Anna!", "Er kam."])).toEqual([
		"en",
		"en",
		"en",
		"de",
	]);
	expect(await languages(["Hm.", "—"])).toEqual([null, null]);
});

test("surroundings cross paragraph boundaries", async () => {
	const jev = fakeJev({ "Er kam.": "German" });
	const text = await detect(jev.ask, [["Er kam."], ["»Hm.«"]]);
	expect(text.paragraphs[1]?.sentences).toEqual([
		{ text: "»Hm.«", language: "de" },
	]);
});

test("judges about 30 Sentences per request, in even windows, and names no target language", async () => {
	const jev = fakeJev({});
	const sentences = Array.from(
		{ length: 31 },
		(_, index) => `Satz ${index}.`,
	);
	await detect(jev.ask, [sentences]);
	expect(
		jev.sent.map(({ state }) => (state.sentences as string[]).length),
	).toEqual([16, 15]);
	expect(Object.keys(jev.sent[0]?.state ?? {})).toEqual(["sentences"]);
	const [question] = Object.values(jev.sent[0]?.questions ?? {});
	expect(question?.type).toBe("choice");
	// The question quotes its Sentence, so jev cannot read a neighbour's.
	expect(String(question?.instructions)).toContain('"Satz 0."');
	expect(
		question?.type === "choice" ? Object.keys(question.criteria) : [],
	).toEqual(["German", "English", "Hebrew", "Other", "Unknown"]);
});

test("a window jev fails fails the operation", async () => {
	const failing: JevAsk = async () => {
		throw Error("TypeSafe is down");
	};
	const exit = await Effect.runPromiseExit(
		createDumgen({ jev: failing, luna }).language.detect({
			paragraphs: [{ sentences: ["Er kam."] }],
		}),
	);
	expect(exit._tag).toBe("Failure");
});
