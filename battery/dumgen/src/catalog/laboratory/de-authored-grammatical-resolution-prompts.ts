import { systemPrompt as fusionSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/construction/fusion";
import { systemPrompt as pairedFrameSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/construction/paired-frame";
import { systemPrompt as adjectiveSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/adjective";
import { systemPrompt as adpositionSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/adposition";
import { systemPrompt as adverbSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/adverb";
import { systemPrompt as auxiliarySystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/auxiliary";
import { systemPrompt as coordinatingConjunctionSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/coordinating-conjunction";
import { systemPrompt as determinerSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/determiner";
import { systemPrompt as interjectionSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/interjection";
import { systemPrompt as nounSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/noun";
import { systemPrompt as numeralSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/numeral";
import { systemPrompt as otherSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/other";
import { systemPrompt as particleSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/particle";
import { systemPrompt as pronounSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/pronoun";
import { systemPrompt as properNounSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/proper-noun";
import { systemPrompt as subordinatingConjunctionSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/subordinating-conjunction";
import { systemPrompt as symbolSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/symbol";
import { systemPrompt as verbSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/lexeme/verb";
import { systemPrompt as aphorismSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/phraseme/aphorism";
import { systemPrompt as collocationSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/phraseme/collocation";
import { systemPrompt as discourseFormulaSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/phraseme/discourse-formula";
import { systemPrompt as idiomSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/phraseme/idiom";
import { systemPrompt as proverbSystemPrompt } from "../../promptsmith/laboratory/generated-system-prompt/grammatical-resolution/de/phraseme/proverb";
import {
	inputSchema as fusionInputSchema,
	outputSchema as fusionOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/construction/fusion/schemas";
import {
	inputSchema as pairedFrameInputSchema,
	outputSchema as pairedFrameOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/construction/paired-frame/schemas";
import {
	inputSchema as adjectiveInputSchema,
	outputSchema as adjectiveOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adjective/schemas";
import {
	inputSchema as adpositionInputSchema,
	outputSchema as adpositionOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adposition/schemas";
import {
	inputSchema as adverbInputSchema,
	outputSchema as adverbOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/adverb/schemas";
import {
	inputSchema as auxiliaryInputSchema,
	outputSchema as auxiliaryOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/auxiliary/schemas";
import {
	inputSchema as coordinatingConjunctionInputSchema,
	outputSchema as coordinatingConjunctionOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/coordinating-conjunction/schemas";
import {
	inputSchema as determinerInputSchema,
	outputSchema as determinerOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/determiner/schemas";
import {
	inputSchema as interjectionInputSchema,
	outputSchema as interjectionOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/interjection/schemas";
import {
	inputSchema as nounInputSchema,
	outputSchema as nounOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/noun/schemas";
import {
	inputSchema as numeralInputSchema,
	outputSchema as numeralOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/numeral/schemas";
import {
	inputSchema as otherInputSchema,
	outputSchema as otherOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/other/schemas";
import {
	inputSchema as particleInputSchema,
	outputSchema as particleOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/particle/schemas";
import {
	inputSchema as pronounInputSchema,
	outputSchema as pronounOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/pronoun/schemas";
import {
	inputSchema as properNounInputSchema,
	outputSchema as properNounOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/proper-noun/schemas";
import {
	inputSchema as subordinatingConjunctionInputSchema,
	outputSchema as subordinatingConjunctionOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/subordinating-conjunction/schemas";
import {
	inputSchema as symbolInputSchema,
	outputSchema as symbolOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/symbol/schemas";
import {
	inputSchema as verbInputSchema,
	verbOutputCodec,
	outputSchema as verbOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/verb/schemas";
import {
	inputSchema as aphorismInputSchema,
	outputSchema as aphorismOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/aphorism/schemas";
import {
	inputSchema as collocationInputSchema,
	outputSchema as collocationOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/collocation/schemas";
import {
	inputSchema as discourseFormulaInputSchema,
	outputSchema as discourseFormulaOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/discourse-formula/schemas";
import {
	inputSchema as idiomInputSchema,
	outputSchema as idiomOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/idiom/schemas";
import {
	inputSchema as proverbInputSchema,
	outputSchema as proverbOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/proverb/schemas";
import { createDeGrammaticalResolutionPrompt } from "./create-de-grammatical-resolution-prompt";

function authoredPrompt<
	const Family extends GermanHighLevelFamily,
	const Kind extends GermanHighLevelKind<Family>,
	InputSchema extends z.ZodType,
	OutputSchema extends z.ZodType,
>(
	family: Family,
	kind: Kind,
	systemPrompt: string,
	inputSchema: InputSchema,
	outputSchema: OutputSchema,
) {
	return createDeGrammaticalResolutionPrompt({
		family,
		kind,
		systemPrompt,
		inputSchema,
		outputSchema,
	});
}

export const DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS = {
	Lexeme: {
		ADJ: authoredPrompt(
			"Lexeme",
			"ADJ",
			adjectiveSystemPrompt,
			adjectiveInputSchema,
			adjectiveOutputSchema,
		),
		ADP: authoredPrompt(
			"Lexeme",
			"ADP",
			adpositionSystemPrompt,
			adpositionInputSchema,
			adpositionOutputSchema,
		),
		ADV: authoredPrompt(
			"Lexeme",
			"ADV",
			adverbSystemPrompt,
			adverbInputSchema,
			adverbOutputSchema,
		),
		AUX: authoredPrompt(
			"Lexeme",
			"AUX",
			auxiliarySystemPrompt,
			auxiliaryInputSchema,
			auxiliaryOutputSchema,
		),
		CCONJ: authoredPrompt(
			"Lexeme",
			"CCONJ",
			coordinatingConjunctionSystemPrompt,
			coordinatingConjunctionInputSchema,
			coordinatingConjunctionOutputSchema,
		),
		DET: authoredPrompt(
			"Lexeme",
			"DET",
			determinerSystemPrompt,
			determinerInputSchema,
			determinerOutputSchema,
		),
		INTJ: authoredPrompt(
			"Lexeme",
			"INTJ",
			interjectionSystemPrompt,
			interjectionInputSchema,
			interjectionOutputSchema,
		),
		NOUN: authoredPrompt(
			"Lexeme",
			"NOUN",
			nounSystemPrompt,
			nounInputSchema,
			nounOutputSchema,
		),
		NUM: authoredPrompt(
			"Lexeme",
			"NUM",
			numeralSystemPrompt,
			numeralInputSchema,
			numeralOutputSchema,
		),
		PART: authoredPrompt(
			"Lexeme",
			"PART",
			particleSystemPrompt,
			particleInputSchema,
			particleOutputSchema,
		),
		PRON: authoredPrompt(
			"Lexeme",
			"PRON",
			pronounSystemPrompt,
			pronounInputSchema,
			pronounOutputSchema,
		),
		PROPN: authoredPrompt(
			"Lexeme",
			"PROPN",
			properNounSystemPrompt,
			properNounInputSchema,
			properNounOutputSchema,
		),
		SCONJ: authoredPrompt(
			"Lexeme",
			"SCONJ",
			subordinatingConjunctionSystemPrompt,
			subordinatingConjunctionInputSchema,
			subordinatingConjunctionOutputSchema,
		),
		SYM: authoredPrompt(
			"Lexeme",
			"SYM",
			symbolSystemPrompt,
			symbolInputSchema,
			symbolOutputSchema,
		),
		VERB: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "VERB",
			systemPrompt: verbSystemPrompt,
			inputSchema: verbInputSchema,
			outputSchema: verbOutputSchema,
			normalizeGenerated: (generated) =>
				verbOutputCodec.decode(generated),
		}),
		X: authoredPrompt(
			"Lexeme",
			"X",
			otherSystemPrompt,
			otherInputSchema,
			otherOutputSchema,
		),
	},
	Phraseme: {
		Aphorism: authoredPrompt(
			"Phraseme",
			"Aphorism",
			aphorismSystemPrompt,
			aphorismInputSchema,
			aphorismOutputSchema,
		),
		Collocation: authoredPrompt(
			"Phraseme",
			"Collocation",
			collocationSystemPrompt,
			collocationInputSchema,
			collocationOutputSchema,
		),
		DiscourseFormula: authoredPrompt(
			"Phraseme",
			"DiscourseFormula",
			discourseFormulaSystemPrompt,
			discourseFormulaInputSchema,
			discourseFormulaOutputSchema,
		),
		Idiom: authoredPrompt(
			"Phraseme",
			"Idiom",
			idiomSystemPrompt,
			idiomInputSchema,
			idiomOutputSchema,
		),
		Proverb: authoredPrompt(
			"Phraseme",
			"Proverb",
			proverbSystemPrompt,
			proverbInputSchema,
			proverbOutputSchema,
		),
	},
	Construction: {
		Fusion: authoredPrompt(
			"Construction",
			"Fusion",
			fusionSystemPrompt,
			fusionInputSchema,
			fusionOutputSchema,
		),
		PairedFrame: authoredPrompt(
			"Construction",
			"PairedFrame",
			pairedFrameSystemPrompt,
			pairedFrameInputSchema,
			pairedFrameOutputSchema,
		),
	},
} as const;

import type { z } from "zod";

import type {
	GermanHighLevelFamily,
	GermanHighLevelKind,
} from "../../schema/german-high-level-routes";
