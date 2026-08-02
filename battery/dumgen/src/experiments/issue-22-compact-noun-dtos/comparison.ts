import { createHash } from "node:crypto";
import { PROMPT_CATALOG } from "../../catalog/prompt-catalog";
import { stableJson } from "../../lib/stable-json";
import {
	compactGrammaticalOutputCodec,
	compactReadingOutputCodec,
} from "./compact-codecs";
import { COMPACT_NOUN_EXPERIMENT_CATALOG } from "./compact-prompts";
import {
	GRAMMATICAL_COMPARISON_CASES,
	READING_COMPARISON_CASES,
} from "./comparison-cases";

type Arm = "verbose" | "compact";
type Stage = "grammaticalResolution" | "readingResolution";

export type DeterministicMeasurement = {
	readonly arm: Arm;
	readonly stage: Stage;
	readonly caseId: string;
	readonly systemPromptBytes: number;
	readonly systemPromptSha256: string;
	readonly serializedInputBytes: number;
	readonly serializedOutputBytes: number;
	readonly estimatedInputTokens: number;
	readonly estimatedOutputTokens: number;
	readonly codecSuccess: boolean;
	readonly canonicalMatchesReference: boolean;
};

export type DeterministicComparison = {
	readonly method: string;
	readonly measurements: readonly DeterministicMeasurement[];
	readonly totals: readonly {
		readonly stage: Stage;
		readonly metric:
			| "systemPromptBytes"
			| "serializedInputBytes"
			| "serializedOutputBytes"
			| "estimatedInputTokens"
			| "estimatedOutputTokens";
		readonly verbose: number;
		readonly compact: number;
		readonly percentDelta: number;
	}[];
};

const verboseGrammarPrompt =
	PROMPT_CATALOG.laboratory.grammaticalResolution.de.Lexeme.NOUN.prompt;
const compactGrammarPrompt =
	COMPACT_NOUN_EXPERIMENT_CATALOG.grammaticalResolution.prompt;
const verboseReadingPrompt =
	PROMPT_CATALOG.laboratory.readingResolution.de.prompt;
const compactReadingPrompt =
	COMPACT_NOUN_EXPERIMENT_CATALOG.readingResolution.prompt;

export function buildDeterministicComparison(): DeterministicComparison {
	const measurements: DeterministicMeasurement[] = [];

	for (const comparisonCase of GRAMMATICAL_COMPARISON_CASES) {
		const verboseInput = comparisonCase.input;
		const verboseOutput = comparisonCase.verboseReferenceOutput;
		const verboseCanonical = verboseGrammarPrompt.projectOutput(
			comparisonCase.input,
			verboseOutput,
		);
		measurements.push(
			measure({
				arm: "verbose",
				stage: "grammaticalResolution",
				caseId: comparisonCase.id,
				systemPrompt: verboseGrammarPrompt.systemPrompt,
				modelInput: verboseInput,
				modelOutput: verboseOutput,
				canonical: verboseCanonical,
				expectedCanonical: comparisonCase.expectedCanonical,
			}),
		);

		const compactInput = compactGrammarPrompt.projectInput(
			comparisonCase.input,
		);
		const compactOutput = compactGrammaticalOutputCodec.encode(
			comparisonCase.expectedCanonical,
		);
		const compactCanonical = compactGrammarPrompt.projectOutput(
			comparisonCase.input,
			compactOutput,
		);
		measurements.push(
			measure({
				arm: "compact",
				stage: "grammaticalResolution",
				caseId: comparisonCase.id,
				systemPrompt: compactGrammarPrompt.systemPrompt,
				modelInput: compactInput,
				modelOutput: compactOutput,
				canonical: compactCanonical,
				expectedCanonical: comparisonCase.expectedCanonical,
			}),
		);
	}

	for (const comparisonCase of READING_COMPARISON_CASES) {
		const verboseInput = {
			markedContext: comparisonCase.input.markedContext,
			lemma: comparisonCase.input.lemma.canonicalForm,
			existingEmojiDescriptions:
				comparisonCase.input.existingEmojiDescriptions,
		};
		const verboseOutput = comparisonCase.verboseReferenceOutput;
		measurements.push(
			measure({
				arm: "verbose",
				stage: "readingResolution",
				caseId: comparisonCase.id,
				systemPrompt: verboseReadingPrompt.systemPrompt,
				modelInput: verboseInput,
				modelOutput: verboseOutput,
				canonical: verboseOutput,
				expectedCanonical: comparisonCase.expectedCanonical,
			}),
		);

		const compactInput = compactReadingPrompt.projectInput(
			comparisonCase.input,
		);
		const compactOutput = compactReadingOutputCodec.encode(
			comparisonCase.expectedCanonical,
		);
		const compactCanonical = compactReadingPrompt.projectOutput(
			comparisonCase.input,
			compactOutput,
		);
		measurements.push(
			measure({
				arm: "compact",
				stage: "readingResolution",
				caseId: comparisonCase.id,
				systemPrompt: compactReadingPrompt.systemPrompt,
				modelInput: compactInput,
				modelOutput: compactOutput,
				canonical: compactCanonical,
				expectedCanonical: comparisonCase.expectedCanonical,
			}),
		);
	}

	return {
		method: "UTF-8 byte counts over generated system prompts and stable JSON; token estimates are ceil(UTF-8 bytes / 4), not provider tokenizer counts.",
		measurements,
		totals: summarize(measurements),
	};
}

function measure(args: {
	readonly arm: Arm;
	readonly stage: Stage;
	readonly caseId: string;
	readonly systemPrompt: string;
	readonly modelInput: unknown;
	readonly modelOutput: unknown;
	readonly canonical: unknown;
	readonly expectedCanonical: unknown;
}): DeterministicMeasurement {
	const serializedInput = stableJson(args.modelInput);
	const serializedOutput = stableJson(args.modelOutput);
	const systemPromptBytes = bytes(args.systemPrompt);
	const serializedInputBytes = bytes(serializedInput);
	const serializedOutputBytes = bytes(serializedOutput);
	return {
		arm: args.arm,
		stage: args.stage,
		caseId: args.caseId,
		systemPromptBytes,
		systemPromptSha256: sha256(args.systemPrompt),
		serializedInputBytes,
		serializedOutputBytes,
		estimatedInputTokens: Math.ceil(
			(systemPromptBytes + serializedInputBytes) / 4,
		),
		estimatedOutputTokens: Math.ceil(serializedOutputBytes / 4),
		codecSuccess: true,
		canonicalMatchesReference:
			stableJson(args.canonical) === stableJson(args.expectedCanonical),
	};
}

function summarize(measurements: readonly DeterministicMeasurement[]) {
	const metrics = [
		"systemPromptBytes",
		"serializedInputBytes",
		"serializedOutputBytes",
		"estimatedInputTokens",
		"estimatedOutputTokens",
	] as const;
	const stages = ["grammaticalResolution", "readingResolution"] as const;
	return stages.flatMap((stage) =>
		metrics.map((metric) => {
			const valuesFor = (arm: Arm) =>
				measurements
					.filter(
						(measurement) =>
							measurement.stage === stage &&
							measurement.arm === arm,
					)
					.reduce(
						(total, measurement) => total + measurement[metric],
						0,
					);
			const verbose = valuesFor("verbose");
			const compact = valuesFor("compact");
			return {
				stage,
				metric,
				verbose,
				compact,
				percentDelta: Number(
					(((compact - verbose) / verbose) * 100).toFixed(2),
				),
			};
		}),
	);
}

function bytes(value: string): number {
	return new TextEncoder().encode(value).byteLength;
}

function sha256(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}
