import { expect, test } from "bun:test";
import {
	evaluateSplitText,
	type SplitTextOutput,
	splitTextMetrics,
	udDraftTexts,
} from "../../src/evaluation/split-text.js";
import { splitText } from "../../src/segment/split-text.js";

const input = {
	language: "de" as const,
	text: "Josef K. kam nicht.\nEr wartete. Dann ging er.",
};
const idealOutput: SplitTextOutput = {
	paragraphs: [
		{
			sentences: ["Josef K. kam nicht.", "Er wartete.", "Dann ging er."],
		},
	],
};

test("a split meeting gold's cuts passes, whatever whitespace it trims or joins", () => {
	expect(
		evaluateSplitText({
			input,
			idealOutput,
			output: {
				paragraphs: [
					{ sentences: ["Josef K. kam nicht."] },
					{ sentences: [" Er wartete. ", "Dann ging er."] },
				],
			},
		}),
	).toEqual({
		contractPass: true,
		textPreserved: true,
		goldBoundaries: 2,
		predictedBoundaries: 2,
		matchedBoundaries: 2,
		goldSentences: 3,
		predictedSentences: 3,
		exactSentences: 3,
		goldParagraphs: 1,
		predictedParagraphs: 2,
	});
});

test("an abbreviation read as a Sentence end adds a false boundary; a missed end loses one", () => {
	const check = evaluateSplitText({
		input,
		idealOutput,
		output: {
			paragraphs: [
				{
					sentences: [
						"Josef K.",
						"kam nicht. Er wartete.",
						"Dann ging er.",
					],
				},
			],
		},
	});
	expect(check).toMatchObject({
		contractPass: false,
		textPreserved: true,
		predictedBoundaries: 2,
		matchedBoundaries: 1,
		exactSentences: 1,
	});
	const metrics = splitTextMetrics({ cases: [{ evaluation: check }] });
	expect(metrics.boundaries).toEqual({
		precision: 1 / 2,
		recall: 1 / 2,
		f1: 1 / 2,
		gold: 2,
	});
	expect(metrics.sentences).toMatchObject({
		precision: 1 / 3,
		recall: 1 / 3,
	});
});

test("a split that drops text is not preserved", () => {
	expect(
		evaluateSplitText({
			input,
			idealOutput,
			output: { paragraphs: [{ sentences: ["Josef K. kam nicht."] }] },
		}),
	).toMatchObject({ contractPass: false, textPreserved: false });
});

test("the ud-drafts Texts read as their paragraphs of Sentences, and splitText keeps every character", () => {
	const texts = udDraftTexts();
	expect(texts.length).toBeGreaterThan(0);
	for (const text of texts) {
		const sentences = text.idealOutput.paragraphs.flatMap(
			({ sentences }) => sentences,
		);
		expect(sentences.join(" ").replace(/\s+/gu, "")).toBe(
			text.input.text.replace(/\s+/gu, ""),
		);
		expect(
			evaluateSplitText({
				...text,
				output: {
					paragraphs: splitText(text.input.text).paragraphs.map(
						({ sentences }) => ({ sentences: [...sentences] }),
					),
				},
			}).textPreserved,
		).toBe(true);
	}
});
