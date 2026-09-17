import { segmentGerman } from "../concrete-lang/de/segmentation/segment.js";
import { segmentHebrew } from "../concrete-lang/he/segmentation/segment.js";
import type {
	DumgenOptions,
	SegmentationDecision,
	SegmentedSentence,
} from "../types.js";
import { DumgenFailure } from "./failure.js";
import { modelCaller } from "./model.js";
import { operationTask } from "./trace.js";
import { parse } from "./validation.js";
export function createSegmentation(options: DumgenOptions) {
	const call = modelCaller(options);
	const task = operationTask(options);
	return function segment(raw: {
		readonly sourceSentences: readonly [string, ...string[]];
	}) {
		return task("segment", raw, async (signal) => {
			const input = parse<{ sourceSentences: string[] }>(
				"segmentInputSchema",
				raw,
				"segment",
			);
			if (input.sourceSentences.some((text) => !text.trim()))
				throw new DumgenFailure(
					"InvalidInput",
					"segment",
					"Source sentences must contain text",
				);
			const decisions: SegmentationDecision[] = [];
			for (
				let offset = 0;
				offset < input.sourceSentences.length;
				offset += 9
			) {
				const items = input.sourceSentences
					.slice(offset, offset + 9)
					.map((sourceText, index) => ({
						id: String(offset + index),
						sourceText,
					}));
				const result = await call<{
					language: "de" | "he" | null;
					items: {
						id: string;
						decision:
							| "Accepted"
							| "UnsupportedLanguage"
							| "Unintelligible";
						language: "de" | "he" | null;
						stitchedText: string;
					}[];
				}>(
					"segment",
					"intake",
					"intake",
					"intakeOutput",
					{ items },
					signal,
				);
				if (result.items.length !== items.length)
					throw new DumgenFailure(
						"InvalidModelOutput",
						"segment",
						"Intake must return one ordered decision per input",
					);
				for (const [index, item] of result.items.entries()) {
					const source = items[index];
					if (!source)
						throw new DumgenFailure(
							"InvalidModelOutput",
							"segment",
							"Intake returned an unexpected item position",
						);
					if (
						item.id !== source.id ||
						item.stitchedText.replaceAll(/\s/gu, "") !==
							source.sourceText.replaceAll(/\s/gu, "")
					)
						throw new DumgenFailure(
							"InvalidModelOutput",
							"segment",
							"Intake must preserve item order and every non-whitespace character",
						);
					if (item.decision !== "Accepted") {
						if (item.language !== null)
							throw new DumgenFailure(
								"InvalidModelOutput",
								"segment",
								"Rejected intake must have no language",
							);
						decisions.push({ decision: item.decision });
						continue;
					}
					if (!item.language || item.language !== result.language)
						throw new DumgenFailure(
							"InvalidModelOutput",
							"segment",
							"Accepted intake must retain its batch Language",
						);
					const segmented =
						item.language === "de"
							? segmentGerman(item.stitchedText)
							: segmentHebrew(item.stitchedText);
					const sentence = {
						id: crypto.randomUUID(),
						language: item.language,
						segments: [...segmented.segments],
					};
					decisions.push(
						parse<SegmentationDecision>(
							"segmentationDecisionSchema",
							{
								decision: "Accepted",
								language: item.language,
								sentence,
							},
							"segment",
							true,
						),
					);
				}
			}
			return decisions;
		});
	};
}

/** Collapse every whitespace run to one ASCII space so Source Segmentation accepts it. */
function stitchTrustedText(text: string): string {
	return text.replaceAll(/\s+/gu, " ").trim();
}

export function createTrustedSegmentation(options: DumgenOptions) {
	const task = operationTask(options);
	return function segmentSentence<L extends "de" | "he">(input: {
		readonly language: L;
		readonly stitchedText: string;
	}) {
		return task("segmentSentence", input, async () => {
			if (input.language !== "de" && input.language !== "he")
				throw new DumgenFailure(
					"InvalidInput",
					"segmentSentence",
					"Trusted segmentation supports only de and he",
				);
			const stitchedText = stitchTrustedText(input.stitchedText);
			if (stitchedText.length === 0)
				throw new DumgenFailure(
					"InvalidInput",
					"segmentSentence",
					"Stitched Text must contain text",
				);
			const segmented =
				input.language === "de"
					? segmentGerman(stitchedText)
					: segmentHebrew(stitchedText);
			return {
				id: crypto.randomUUID(),
				language: input.language,
				segments: [...segmented.segments],
			} satisfies SegmentedSentence<L>;
		});
	};
}
