import { segmentGerman } from "../concrete-lang/de/segmentation/segment.js";
import { segmentEnglish } from "../concrete-lang/en/segmentation/segment.js";
import { segmentHebrew } from "../concrete-lang/he/segmentation/segment.js";
import type {
	DumgenOptions,
	SegmentationDecision,
	SegmentedSentence,
} from "../types.js";
import { DumgenFailure } from "./failure.js";
import { judgmentCaller, recordedJudgment } from "./judgment.js";
import { effectiveConfiguration, executeGeneration } from "./model.js";
import { choice } from "./questions.js";
import { assertStitchedText } from "./segmentation.js";
import { operationTask, recordEvent } from "./trace.js";
import { parse } from "./validation.js";

const segmenters = { de: segmentGerman, en: segmentEnglish, he: segmentHebrew };
export function createSegmentation(options: DumgenOptions) {
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
			// Sentences are judged independently, so every intake judgment is
			// issued at once; the result keeps the input order by index.
			const decide = async (
				index: number,
				sourceText: string,
			): Promise<SegmentationDecision> => {
				const state = { id: String(index), sourceText };
				const result = await judgmentCaller(options)(
					"segment",
					"intake",
					state,
					{
						language: choice(
							"Determine this sentence's primary language independently of any neighboring sentence. Typos, slang, spacing damage and a local foreign span do not change its primary language.",
							{
								de: "German",
								en: "English",
								he: "Hebrew",
								UnsupportedLanguage:
									"An intelligible primary language other than German, English or Hebrew",
								Unresolved:
									"No defensible primary-language judgment",
							},
						),
						validity: choice(
							"Does this sentence contain useful, intelligible linguistic material? Allow typos, informal speech, spacing damage and local foreign spans. Reject only when no defensible reading exists.",
							{
								Accepted: "Intelligible linguistic material",
								Unintelligible: "No defensible reading exists",
								Unresolved: "Cannot decide validity",
							},
						),
						stitching: choice(
							"Does whitespace need repair? This includes split words, accidentally joined words, leading/trailing whitespace, non-ASCII whitespace or repeated spaces. Do not judge spelling, casing or punctuation repair.",
							{
								Needed: "Whitespace repair is needed",
								Unchanged:
									"Source is already trimmed with single ASCII spaces and needs no word-boundary repair",
								Unresolved:
									"Cannot decide whether whitespace repair is needed",
							},
						),
					},
					signal,
					[],
				);
				const answer = (key: string) => {
					const value =
						result.answers[key as keyof typeof result.answers];
					return value?.type === "choice"
						? value.choice
						: "Unresolved";
				};
				const language = answer("language"),
					validity = answer("validity");
				recordEvent(signal, "IntakeJudgments", {
					index,
					sourceText,
					answers: result.answers,
				});
				if (validity === "Unintelligible") {
					return { decision: "Unintelligible" };
				}
				if (language === "UnsupportedLanguage") {
					return { decision: "UnsupportedLanguage" };
				}
				if (
					validity !== "Accepted" ||
					!["de", "en", "he"].includes(language) ||
					answer("stitching") === "Unresolved"
				)
					throw new DumgenFailure(
						"Unresolved",
						"segment",
						`Intake unresolved for sentence ${index}`,
						"intake",
					);
				const supportedLanguage = language as "de" | "en" | "he";
				let stitchedText = sourceText;
				if (answer("stitching") === "Needed") {
					const output = await executeGeneration(
						options,
						{
							stage: "segment",
							route: "intake",
							input: { sourceText, language: supportedLanguage },
							signal,
							configuration: effectiveConfiguration(
								options,
								"intake",
							),
							systemPrompt:
								"Repair whitespace only in this one source sentence. Delete whitespace that splits one word; insert an ASCII space between accidentally joined words. Collapse remaining whitespace runs to a single ASCII space and trim edges. Preserve every non-whitespace Unicode code point in exactly its original order. Never correct spelling, casing, slang, wording or punctuation. Return only stitchedText.",
							outputSchema: {
								type: "object",
								properties: {
									stitchedText: { type: "string" },
								},
								required: ["stitchedText"],
								additionalProperties: false,
							},
						},
						(value) => {
							if (
								!value ||
								typeof value !== "object" ||
								Object.keys(value).length !== 1 ||
								!("stitchedText" in value) ||
								typeof value.stitchedText !== "string"
							)
								throw Error(
									"Stitching must return only stitchedText",
								);
							if (
								value.stitchedText.replaceAll(/\s/gu, "") !==
								sourceText.replaceAll(/\s/gu, "")
							)
								throw Error(
									"Stitching changed non-whitespace characters",
								);
							assertStitchedText(value.stitchedText);
							return value.stitchedText;
						},
						[recordedJudgment(signal, state).id],
					);
					stitchedText = output;
				}
				const segmented = segmenters[supportedLanguage](stitchedText);
				const decision = parse<SegmentationDecision>(
					"segmentationDecisionSchema",
					{
						decision: "Accepted",
						language: supportedLanguage,
						sentence: {
							id: crypto.randomUUID(),
							language: supportedLanguage,
							segments: [...segmented.segments],
						},
					},
					"segment",
					true,
				);
				recordEvent(signal, "SourceSegmentation", {
					index,
					sourceText,
					stitchedText,
					decision,
					rules: segmented.trace,
				});
				return decision;
			};
			return Promise.all(
				input.sourceSentences.map((sourceText, index) =>
					decide(index, sourceText),
				),
			);
		});
	};
}

/** Collapse every whitespace run to one ASCII space so Source Segmentation accepts it. */
function stitchTrustedText(text: string): string {
	return text.replaceAll(/\s+/gu, " ").trim();
}

export function createTrustedSegmentation(options: DumgenOptions) {
	const task = operationTask(options);
	return function segmentSentence<L extends "de" | "en" | "he">(input: {
		readonly language: L;
		readonly stitchedText: string;
	}) {
		return task("segmentSentence", input, async () => {
			if (!Object.hasOwn(segmenters, input.language))
				throw new DumgenFailure(
					"InvalidInput",
					"segmentSentence",
					"Trusted segmentation supports de, en and he",
				);
			const stitchedText = stitchTrustedText(input.stitchedText);
			if (stitchedText.length === 0)
				throw new DumgenFailure(
					"InvalidInput",
					"segmentSentence",
					"Stitched Text must contain text",
				);
			const segmented = segmenters[input.language](stitchedText);
			return {
				id: crypto.randomUUID(),
				language: input.language,
				segments: [...segmented.segments],
			} satisfies SegmentedSentence<L>;
		});
	};
}
