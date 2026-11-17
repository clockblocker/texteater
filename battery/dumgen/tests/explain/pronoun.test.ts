import { expect, test } from "bun:test";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { pronounExplanationPrompt } from "../../src/explain/de/prompt.js";
import { markedPassage } from "../../src/explain/pronoun.js";
import type {
	ExplainPronounInput,
	PassageSentence,
} from "../../src/explain/types.js";
import type { LunaAsk, LunaRequest } from "../../src/luna.js";
import { operations } from "../../src/operations.js";
import type { JevAsk } from "../../src/segment/jev.js";
import { liveOver } from "../live-over.js";

const jev: JevAsk = async () => {
	throw Error("explain.pronoun never asks jev");
};

/** A Luna answering every request with `output`, keeping what it was sent. */
function fakeLuna(output: unknown) {
	const sent: LunaRequest[] = [];
	const ask: LunaAsk = async (request) => {
		sent.push(request);
		return { output, metadata: { usage: {} } };
	};
	return { ask, sent };
}

const explain =
	(luna: ReturnType<typeof fakeLuna>) => (input: ExplainPronounInput) =>
		Effect.runPromiseExit(
			operations.explain
				.pronoun(input)
				.pipe(Effect.provide(liveOver({ jev, luna: luna.ask }))),
		);

/** A Sentence of Segments numbered from `from`, candidates named by those numbers. */
function sentence(
	texts: readonly string[],
	candidates: readonly (readonly number[])[] = [],
	from = 0,
): PassageSentence {
	return {
		segments: texts.map((text, at) => ({ index: from + at, text })),
		candidates,
	};
}

// "Der Hund sah die Katze. Er bellte."
const passage = [
	sentence(
		["Der", " ", "Hund", " ", "sah", " ", "die", " ", "Katze", "."],
		[[2], [8]],
	),
	sentence(["Er", " ", "bellte", "."]),
];

test("the passage marks each candidate by its id and the pronoun apart", () => {
	expect(markedPassage({ language: "de", passage, pronoun: [0] })).toEqual({
		passage: "Der [n1:Hund] sah die [n2:Katze]. <<Er>> bellte.",
		pronoun: "Er",
		candidates: [
			{
				id: "n1",
				text: "Hund",
				antecedent: { sentence: 0, segments: [2] },
			},
			{
				id: "n2",
				text: "Katze",
				antecedent: { sentence: 0, segments: [8] },
			},
		],
	});
});

test("a cut Sentence opens with an ellipsis, and a name of several words is one mark", () => {
	const marked = markedPassage({
		language: "de",
		passage: [
			{
				...sentence(
					["sah", " ", "Angela", " ", "Merkel", "."],
					[[6, 8]],
					4,
				),
				cut: true,
			},
			sentence(["Sie", " ", "lachte", "."]),
		],
		pronoun: [0],
	});
	expect(marked.passage).toBe("… sah [n1:Angela Merkel]. <<Sie>> lachte.");
	expect(marked.candidates[0]?.text).toBe("Angela Merkel");
});

test("Luna names ids; the candidates come back once each, a made-up id dropped", async () => {
	const luna = fakeLuna({ refersTo: "Candidates", ids: ["n1", "n9", "n1"] });
	const exit = await explain(luna)({ language: "de", passage, pronoun: [0] });
	expect(exit).toEqual(Exit.succeed([{ sentence: 0, segments: [2] }]));
	expect(luna.sent).toHaveLength(1);
	expect(luna.sent[0]).toMatchObject({
		systemPrompt: pronounExplanationPrompt,
		outputFormat: "json",
		outputSchema: {
			type: "object",
			properties: {
				refersTo: { type: "string", enum: ["Candidates", "Nothing"] },
				ids: {
					type: "array",
					items: { type: "string", enum: ["n1", "n2"] },
				},
			},
		},
		input: {
			passage: "Der [n1:Hund] sah die [n2:Katze]. <<Er>> bellte.",
			pronoun: "Er",
			candidates: [
				{ id: "n1", text: "Hund" },
				{ id: "n2", text: "Katze" },
			],
		},
		configuration: { model: "gpt-5.6-luna" },
	});
});

test("an answer of Nothing refers to nothing; no candidate asks nothing", async () => {
	expect(
		await explain(fakeLuna({ refersTo: "Nothing", ids: ["n1"] }))({
			language: "de",
			passage,
			pronoun: [0],
		}),
	).toEqual(Exit.succeed([]));
	const luna = fakeLuna({ refersTo: "Candidates", ids: ["n1"] });
	const exit = await explain(luna)({
		language: "de",
		passage: [sentence(["Es", " ", "regnet", "."])],
		pronoun: [0],
	});
	expect(exit).toEqual(Exit.succeed([]));
	expect(luna.sent).toEqual([]);
});

test("an answer that is no list of ids is invalid model output", async () => {
	const exit = await explain(fakeLuna(["n1"]))({
		language: "de",
		passage,
		pronoun: [0],
	});
	expect(Exit.isFailure(exit)).toBe(true);
	if (Exit.isFailure(exit))
		expect(Cause.squash(exit.cause)).toMatchObject({
			_tag: "InvalidModelOutput",
			stage: "explanation.pronoun",
		});
});

test("a pronoun outside its Sentence or a candidate on the pronoun is a Defect", async () => {
	for (const input of [
		{ language: "de", passage, pronoun: [7] },
		{
			language: "de",
			passage: [sentence(["Er", " ", "bellte", "."], [[0]])],
			pronoun: [0],
		},
	] as const) {
		const exit = await explain(fakeLuna([]))(input);
		expect(Exit.isFailure(exit) && Cause.hasDies(exit.cause)).toBe(true);
	}
});
