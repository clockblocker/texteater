import type { Questions, SystemOneResult } from "promptsmith/typesafe";
import type { DumgenOptions, SegmentedSentence } from "../../../types.js";
import { judgmentCaller } from "../../../universal/judgment.js";
import { recordEvent } from "../../../universal/trace.js";
import { parse } from "../../../universal/validation.js";
import type { SentenceAnalysis } from "./analysis.js";
import { assembleAnalysis } from "./assemble.js";
import { governmentQuestions } from "./government.js";
import { placeSegments } from "./placement.js";
import {
	analysisState,
	chunk,
	lexemeQuestions,
	phrasemeQuestions,
} from "./questions.js";

/**
 * Intake-time analysis of one accepted German sentence (Dumgen ADR 0006):
 * both layers' questions and the government questions over one state,
 * chunked only when the question count exceeds the request budget, then pure
 * assembly. A sentence with no
 * resolvable Segment has an empty analysis and makes no call.
 */
export async function analyzeGermanSentence(
	options: DumgenOptions,
	sentence: SegmentedSentence<"de">,
	signal: AbortSignal,
): Promise<SentenceAnalysis> {
	const placement = placeSegments(sentence);
	const government = governmentQuestions(sentence, placement);
	const questions: Questions = {
		...lexemeQuestions(sentence, placement.resolvable),
		...phrasemeQuestions(sentence, placement.resolvable),
		...government,
	};
	const answers: Record<
		string,
		SystemOneResult<Questions>["answers"][string]
	> = {};
	if (Object.keys(questions).length) {
		const judge = judgmentCaller(options);
		const state = analysisState(
			sentence,
			Object.keys(government).length > 0,
		);
		const parts = chunk(questions);
		const results = await Promise.all(
			parts.map((part) =>
				judge(
					"analyzeSentence",
					"de/sentence",
					state,
					part,
					signal,
					[],
				),
			),
		);
		for (const result of results) Object.assign(answers, result.answers);
		recordEvent(signal, "SentenceQuestions", {
			questions: Object.keys(questions).length,
			calls: parts.length,
		});
	}
	const assembled = assembleAnalysis(sentence, placement, answers);
	recordEvent(signal, "SentenceAssembled", {
		targets: assembled.targets.length,
		phrasemes: assembled.phrasemes.length,
		fusions: assembled.fusions.length,
	});
	return parse<SentenceAnalysis>(
		"sentenceAnalysisSchema",
		{ sentenceId: sentence.id, language: "de", ...assembled },
		"analyzeSentence",
		true,
	);
}
