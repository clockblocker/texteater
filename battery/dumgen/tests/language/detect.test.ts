import { expect } from "bun:test";
import { testEffect } from "common-utils/effect-test";
import * as Effect from "effect/Effect";
import type { LunaAsk } from "../../src/luna.js";
import type { OperationTrace } from "../../src/operation-trace.js";
import { operations } from "../../src/operations.js";
import {
	type JevAsk,
	type JevRequest,
	pinnedJevModel,
} from "../../src/segment/jev.js";
import { liveOver } from "../live-over.js";

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
	operations.language
		.detect({
			paragraphs: paragraphs.map((sentences) => ({ sentences })),
		})
		.pipe(
			Effect.provide(
				liveOver({
					jev,
					luna,
					...(onOperation ? { onOperation } : {}),
				}),
			),
		);

testEffect(
	"gives each Sentence the language jev picks, and Other for one Intake does not name",
	() =>
		Effect.gen(function* () {
			const jev = fakeJev({
				"Lies den Text.": "German",
				"Read the text.": "English",
				"Je ne sais pas.": "Other",
			});
			expect(
				yield* detect(jev.ask, [
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
					{
						sentences: [
							{ text: "Je ne sais pas.", language: "other" },
						],
					},
				],
			});
		}),
);

testEffect(
	"code settles mostly-Hebrew and letterless Sentences without asking about them",
	() =>
		Effect.gen(function* () {
			const jev = fakeJev({ "Er sagte שלום.": "German" });
			const traces: OperationTrace[] = [];
			const text = yield* detect(
				jev.ask,
				[["אני גר ב-Tel Aviv.", "1984.", "Er sagte שלום."]],
				(trace) => traces.push(trace),
			);
			expect(
				text.paragraphs[0]?.sentences.map(({ language }) => language),
			).toEqual(["he", "he", "de"]);
			expect(jev.sent).toHaveLength(1);
			expect(Object.keys(jev.sent[0]?.questions ?? {})).toEqual([
				"sentence-2",
			]);
			// The state still shows every Sentence of the window, for context.
			expect(jev.sent[0]?.state).toEqual({
				sentences: ["אני גר ב-Tel Aviv.", "1984.", "Er sagte שלום."],
			});
			expect(traces[0]?.operation).toBe("language.detect");
			expect(traces[0]?.events?.[0]?.name).toBe("DetectedLanguages");
		}),
);

testEffect(
	"an undetermined Sentence takes the language before it, else after it, else none",
	() =>
		Effect.gen(function* () {
			const jev = fakeJev({
				"Er kam.": "German",
				"He came.": "English",
			});
			const languages = (sentences: readonly string[]) =>
				detect(jev.ask, [sentences]).pipe(
					Effect.map((result) =>
						result.paragraphs[0]?.sentences.map(
							({ language }) => language ?? null,
						),
					),
				);
			expect(
				yield* languages(["Hm.", "He came.", "Anna!", "Er kam."]),
			).toEqual(["en", "en", "en", "de"]);
			expect(yield* languages(["Hm.", "—"])).toEqual([null, null]);
		}),
);

testEffect("surroundings cross paragraph boundaries", () =>
	Effect.gen(function* () {
		const jev = fakeJev({ "Er kam.": "German" });
		const text = yield* detect(jev.ask, [["Er kam."], ["»Hm.«"]]);
		expect(text.paragraphs[1]?.sentences).toEqual([
			{ text: "»Hm.«", language: "de" },
		]);
	}),
);

testEffect(
	"judges about 30 Sentences per request, in even windows, and names no target language",
	() =>
		Effect.gen(function* () {
			const jev = fakeJev({});
			const sentences = Array.from(
				{ length: 31 },
				(_, index) => `Satz ${index}.`,
			);
			yield* detect(jev.ask, [sentences]);
			expect(
				jev.sent.map(
					({ state }) => (state.sentences as string[]).length,
				),
			).toEqual([16, 15]);
			expect(Object.keys(jev.sent[0]?.state ?? {})).toEqual([
				"sentences",
			]);
			const [question] = Object.values(jev.sent[0]?.questions ?? {});
			expect(question?.type).toBe("choice");
			// The question quotes its Sentence, so jev cannot read a neighbour's.
			expect(String(question?.instructions)).toContain('"Satz 0."');
			expect(
				question?.type === "choice"
					? Object.keys(question.criteria)
					: [],
			).toEqual(["German", "English", "Hebrew", "Other", "Unknown"]);
		}),
);

testEffect("a window jev fails fails the operation", () =>
	Effect.gen(function* () {
		const failing: JevAsk = async () => {
			throw Error("TypeSafe is down");
		};
		const exit = yield* Effect.exit(
			operations.language
				.detect({ paragraphs: [{ sentences: ["Er kam."] }] })
				.pipe(Effect.provide(liveOver({ jev: failing, luna }))),
		);
		expect(exit._tag).toBe("Failure");
	}),
);
