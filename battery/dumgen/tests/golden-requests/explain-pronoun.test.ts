import { test } from "bun:test";
import type {
	ExplainPronounInput,
	PassageSentence,
} from "../../src/explain/types.js";
import { expectGolden, recorded } from "./support.js";

/** Luna names the first candidate it was offered. */
const firstCandidate = ({ input }: { readonly input: unknown }) => {
	const { candidates } = input as {
		readonly candidates: readonly { readonly id: string }[];
	};
	return {
		refersTo: "Candidates",
		ids: candidates.slice(0, 1).map(({ id }) => id),
	};
};

const explain = (input: ExplainPronounInput) =>
	recorded((dumgen) => dumgen.explain.pronoun(input), {
		luna: firstCandidate,
	});

const words = (
	texts: readonly string[],
	candidates: readonly (readonly number[])[] = [],
	from = 0,
): PassageSentence => ({
	segments: texts.map((text, at) => ({ index: from + at, text })),
	candidates,
});

test("explain.pronoun sends the golden requests", async () => {
	await expectGolden("explain-pronoun", {
		// Context before the pronoun, cut at its start, with a two-word name.
		context: await explain({
			language: "de",
			passage: [
				{
					...words(
						["traf", " ", "Anna", " ", "Lena", " ", "Berger", "."],
						[[2], [4, 6]],
						3,
					),
					cut: true,
				},
				words(["Der", " ", "Hund", " ", "bellte", "."], [[2]]),
				words(["Sie", " ", "lachten", " ", "über", " ", "ihn", "."]),
			],
			pronoun: [0],
		}),
		// A candidate after the pronoun in its own Sentence.
		forward: await explain({
			language: "de",
			passage: [
				words(
					[
						"Als",
						" ",
						"sie",
						" ",
						"kam",
						",",
						" ",
						"lachte",
						" ",
						"Maria",
						".",
					],
					[[9]],
				),
			],
			pronoun: [2],
		}),
		// No candidate: nothing is asked.
		expletive: await explain({
			language: "de",
			passage: [words(["Es", " ", "regnet", "."])],
			pronoun: [0],
		}),
	});
});
