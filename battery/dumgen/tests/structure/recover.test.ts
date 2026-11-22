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
	throw Error("structure.recover never asks Luna");
};

/**
 * A fake jev that answers boundary Choices from `breakBefore` (by Sentence
 * text), returning NewParagraph at 0.9 or SameParagraph at 0.9.
 */
function fakeJev(breakBefore: readonly string[]) {
	const breaks = new Set(breakBefore);
	const sent: JevRequest[] = [];
	const ask: JevAsk = async (request) => {
		sent.push(request);
		const sentences = request.state.sentences as string[];
		const answers = Object.fromEntries(
			Object.entries(request.questions).map(([id, question]) => {
				const index = Number(
					/decide whether `sentences\[(\d+)\]` starts a new paragraph/u.exec(
						String(question.instructions),
					)?.[1],
				);
				const isBreak = breaks.has(sentences[index] ?? "");
				return [
					id,
					{
						type: "choice",
						choice: isBreak ? "NewParagraph" : "SameParagraph",
						confidence: 0.9,
						probabilities: isBreak
							? { NewParagraph: 0.9, SameParagraph: 0.1 }
							: { NewParagraph: 0.1, SameParagraph: 0.9 },
					},
				];
			}),
		);
		return {
			model: pinnedJevModel,
			answers,
			usage: { input_tokens: 100, output_tokens: 10 },
		};
	};
	return { ask, sent };
}

const recover = (
	jev: JevAsk,
	paragraphs: readonly (readonly string[])[],
	onOperation?: (trace: OperationTrace) => void,
) =>
	operations.structure
		.recover({
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
	"well-formatted paragraphs pass through untouched with zero jev calls",
	() =>
		Effect.gen(function* () {
			const jev = fakeJev([]);
			const result = yield* recover(jev.ask, [
				["Er kam spät.", "Sie wartete."],
				["»Hallo«, sagte er."],
			]);
			expect(result).toEqual({
				paragraphs: [
					{ sentences: ["Er kam spät.", "Sie wartete."] },
					{ sentences: ["»Hallo«, sagte er."] },
				],
			});
			expect(jev.sent).toHaveLength(0);
		}),
);

testEffect(
	"skips inside-quote boundaries, splits direct quote-to-quote turns in code, and asks jev only for ambiguous boundaries",
	() =>
		Effect.gen(function* () {
			const sentences = [
				"Wir gingen los.",
				"»Zoey, hörst du zu?",
				"Er hatte vier Bier.",
				"Bestimmt.«",
				"»Ja«, murmelte ich.",
				"»Schon okay.«",
				"K verzog das Gesicht.",
				"»Okay, das ist echt eklig.«",
			];
			const jev = fakeJev([
				"»Zoey, hörst du zu?",
				"K verzog das Gesicht.",
			]);
			const traces: OperationTrace[] = [];
			const result = yield* recover(jev.ask, [sentences], (trace) =>
				traces.push(trace),
			);

			expect(result).toEqual({
				paragraphs: [
					{ sentences: ["Wir gingen los."] },
					{
						sentences: [
							"»Zoey, hörst du zu?",
							"Er hatte vier Bier.",
							"Bestimmt.«",
						],
					},
					{
						sentences: ["»Ja«, murmelte ich.", "»Schon okay.«"],
					},
					{
						sentences: [
							"K verzog das Gesicht.",
							"»Okay, das ist echt eklig.«",
						],
					},
				],
			});

			// Inside-quote (indices 2, 3) and direct quote-to-quote (index 4) were settled in code.
			expect(jev.sent).toHaveLength(1);
			expect(Object.keys(jev.sent[0]?.questions ?? {})).toEqual([
				"boundary-1",
				"boundary-5",
				"boundary-6",
				"boundary-7",
			]);
			expect(traces[0]?.operation).toBe("structure.recover");
			expect(traces[0]?.events?.[0]?.name).toBe("RecoveredStructure");
		}),
);

testEffect(
	"windows long flattened paragraphs with left context overlap and preserves every Sentence verbatim",
	() =>
		Effect.gen(function* () {
			const sentences = Array.from(
				{ length: 50 },
				(_, index) =>
					`Satz Nummer ${index} enthält eine ausreichend lange Beschreibung der Szene für das Fenster.`,
			);
			const jev = fakeJev([sentences[25] ?? ""]);
			const result = yield* recover(jev.ask, [sentences]);

			// 50 Sentences > windowSize 40 -> 2 parallel windows; window 2 carries 6 Sentences of left overlap.
			expect(jev.sent).toHaveLength(2);
			const windowSizes = jev.sent
				.map(({ state }) => (state.sentences as string[]).length)
				.sort((a, b) => a - b);
			expect(windowSizes).toEqual([25, 31]);

			expect(result.paragraphs).toEqual([
				{ sentences: sentences.slice(0, 25) },
				{ sentences: sentences.slice(25) },
			]);
		}),
);

testEffect("a window jev fails fails the operation", () =>
	Effect.gen(function* () {
		const failing: JevAsk = async () => {
			throw Error("TypeSafe is down");
		};
		const exit = yield* Effect.exit(
			operations.structure
				.recover({
					paragraphs: [
						{
							sentences: ["Er kam.", "»Hallo!«", "»Tschüss!«"],
						},
					],
				})
				.pipe(Effect.provide(liveOver({ jev: failing, luna }))),
		);
		expect(exit._tag).toBe("Failure");
	}),
);
