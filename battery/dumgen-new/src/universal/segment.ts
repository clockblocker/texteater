import { segmentGerman } from "../concrete-lang/de/segmentation/segment.js";
import { segmentHebrew } from "../concrete-lang/he/segmentation/segment.js";
import type { DumgenOptions, SegmentationDecision } from "../types.js";
import { DumgenFailure } from "./failure.js";
import { modelCaller } from "./model.js";
import { task } from "./task.js";
import { parse } from "./validation.js";
export function createSegmentation(options: DumgenOptions) {
	const call = modelCaller(options);
	return function segment(raw: {
		readonly sourceSentences: readonly [string, ...string[]];
	}) {
		return task("segment", async (signal) => {
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
					const source = items[index]!;
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
