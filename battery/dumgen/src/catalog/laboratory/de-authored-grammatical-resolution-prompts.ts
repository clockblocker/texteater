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
	projectNounNormalizedSurface,
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
	outputSchema as verbOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/lexeme/verb/schemas";
import {
	inputSchema as aphorismInputSchema,
	outputSchema as aphorismOutputSchema,
} from "../../promptsmith/laboratory/prompt-source/grammatical-resolution/de/phraseme/aphorism/schemas";
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
import { createDeGrammaticalResolutionPrompt } from "./de-grammatical-resolution-seam";

export const DE_AUTHORED_GRAMMATICAL_RESOLUTION_PROMPTS = {
	Lexeme: {
		ADJ: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "ADJ",
			systemPrompt: adjectiveSystemPrompt,
			inputSchema: adjectiveInputSchema,
			outputSchema: adjectiveOutputSchema,
		}),
		ADP: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "ADP",
			systemPrompt: adpositionSystemPrompt,
			inputSchema: adpositionInputSchema,
			outputSchema: adpositionOutputSchema,
		}),
		ADV: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "ADV",
			systemPrompt: adverbSystemPrompt,
			inputSchema: adverbInputSchema,
			outputSchema: adverbOutputSchema,
		}),
		AUX: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "AUX",
			systemPrompt: auxiliarySystemPrompt,
			inputSchema: auxiliaryInputSchema,
			outputSchema: auxiliaryOutputSchema,
		}),
		CCONJ: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "CCONJ",
			systemPrompt: coordinatingConjunctionSystemPrompt,
			inputSchema: coordinatingConjunctionInputSchema,
			outputSchema: coordinatingConjunctionOutputSchema,
		}),
		DET: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "DET",
			systemPrompt: determinerSystemPrompt,
			inputSchema: determinerInputSchema,
			outputSchema: determinerOutputSchema,
		}),
		INTJ: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "INTJ",
			systemPrompt: interjectionSystemPrompt,
			inputSchema: interjectionInputSchema,
			outputSchema: interjectionOutputSchema,
		}),
		NOUN: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "NOUN",
			systemPrompt: nounSystemPrompt,
			inputSchema: nounInputSchema,
			outputSchema: nounOutputSchema,
			normalizedSurfaceProjector: projectNounNormalizedSurface,
		}),
		NUM: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "NUM",
			systemPrompt: numeralSystemPrompt,
			inputSchema: numeralInputSchema,
			outputSchema: numeralOutputSchema,
		}),
		PART: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "PART",
			systemPrompt: particleSystemPrompt,
			inputSchema: particleInputSchema,
			outputSchema: particleOutputSchema,
		}),
		PRON: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "PRON",
			systemPrompt: pronounSystemPrompt,
			inputSchema: pronounInputSchema,
			outputSchema: pronounOutputSchema,
		}),
		PROPN: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "PROPN",
			systemPrompt: properNounSystemPrompt,
			inputSchema: properNounInputSchema,
			outputSchema: properNounOutputSchema,
		}),
		SCONJ: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "SCONJ",
			systemPrompt: subordinatingConjunctionSystemPrompt,
			inputSchema: subordinatingConjunctionInputSchema,
			outputSchema: subordinatingConjunctionOutputSchema,
		}),
		SYM: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "SYM",
			systemPrompt: symbolSystemPrompt,
			inputSchema: symbolInputSchema,
			outputSchema: symbolOutputSchema,
		}),
		VERB: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "VERB",
			systemPrompt: verbSystemPrompt,
			inputSchema: verbInputSchema,
			outputSchema: verbOutputSchema,
			fixedLemmaCoreFeatures: { verbType: null },
		}),
		X: createDeGrammaticalResolutionPrompt({
			family: "Lexeme",
			kind: "X",
			systemPrompt: otherSystemPrompt,
			inputSchema: otherInputSchema,
			outputSchema: otherOutputSchema,
		}),
	},
	Phraseme: {
		Aphorism: createDeGrammaticalResolutionPrompt({
			family: "Phraseme",
			kind: "Aphorism",
			systemPrompt: aphorismSystemPrompt,
			inputSchema: aphorismInputSchema,
			outputSchema: aphorismOutputSchema,
		}),
		DiscourseFormula: createDeGrammaticalResolutionPrompt({
			family: "Phraseme",
			kind: "DiscourseFormula",
			systemPrompt: discourseFormulaSystemPrompt,
			inputSchema: discourseFormulaInputSchema,
			outputSchema: discourseFormulaOutputSchema,
		}),
		Idiom: createDeGrammaticalResolutionPrompt({
			family: "Phraseme",
			kind: "Idiom",
			systemPrompt: idiomSystemPrompt,
			inputSchema: idiomInputSchema,
			outputSchema: idiomOutputSchema,
		}),
		Proverb: createDeGrammaticalResolutionPrompt({
			family: "Phraseme",
			kind: "Proverb",
			systemPrompt: proverbSystemPrompt,
			inputSchema: proverbInputSchema,
			outputSchema: proverbOutputSchema,
		}),
	},
	Construction: {
		Fusion: createDeGrammaticalResolutionPrompt({
			family: "Construction",
			kind: "Fusion",
			systemPrompt: fusionSystemPrompt,
			inputSchema: fusionInputSchema,
			outputSchema: fusionOutputSchema,
		}),
		PairedFrame: createDeGrammaticalResolutionPrompt({
			family: "Construction",
			kind: "PairedFrame",
			systemPrompt: pairedFrameSystemPrompt,
			inputSchema: pairedFrameInputSchema,
			outputSchema: pairedFrameOutputSchema,
		}),
	},
} as const;
