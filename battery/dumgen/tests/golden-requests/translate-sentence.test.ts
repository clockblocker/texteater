import { test } from "bun:test";
import type { TranslateSentenceInput } from "../../src/translate/types.js";
import { expectGolden, recorded } from "./support.js";

/** Luna's translation: the language and Sentence it was asked for, so each request's answer is its own. */
const translation = ({ input }: { readonly input: unknown }) => {
	const { language, sentence } = input as {
		readonly language: string;
		readonly sentence: string;
	};
	return ` ${language}: ${sentence} `;
};

const translate = (input: TranslateSentenceInput) =>
	recorded((dumgen) => dumgen.translate.sentence(input), {
		luna: translation,
	});

test("translate.sentence sends the golden requests", async () => {
	await expectGolden("translate-sentence", {
		// Both neighbours, trimmed, as context.
		neighbours: await translate({
			language: "de",
			sentence: "  Der Hund bellt. ",
			into: "en",
			neighbours: {
				before: " Es war Nacht.",
				after: "Niemand hörte ihn. ",
			},
		}),
		// A blank neighbour is left out.
		before: await translate({
			language: "de",
			sentence: "Sie lachte.",
			into: "ru",
			neighbours: { before: "Er erzählte einen Witz.", after: "  " },
		}),
		alone: await translate({
			language: "de",
			sentence: "Guten Morgen!",
			into: "ru",
		}),
	});
});
