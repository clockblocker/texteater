import {
	encodedRuntimePromptArtifacts,
	loadEncodedRuntimePromptData,
	type RuntimePromptPath,
} from "../generated/runtime-prompt-artifacts.js";
import type { IntakeBatch } from "../intake/contracts.js";
import type { GeneratedKnowledgeUpdate } from "../knowledge-generation/de/projection.js";
import { projectGermanKnowledgeUpdate } from "../knowledge-generation/de/projection.js";
import type {
	GermanKnowledgeAnalysis,
	GermanKnowledgeGenerationInput,
} from "../knowledge-generation/de/runtime-schema.js";
import type {
	AnalysisTarget,
	GrammaticalResolution,
	GrammaticalResolutionInput,
	ReadingInput,
	SegmentKind,
	Unresolved,
} from "../types.js";
import type { Prompt, PromptCatalogEntry } from "./prompt-definition.js";
import { runtimePromptDispatch } from "./runtime-prompt-dispatch.js";
import {
	createRuntimeCombinedKnowledgeModelOutputSchema,
	createRuntimePromptSchema,
	type RuntimePromptSchema,
} from "./runtime-prompt-validation.js";

type RuntimePrompt = Readonly<{
	generationParams: Readonly<{ maxOutputTokens: number; model: string }>;
	inputSchema: RuntimePromptSchema;
	modelInputSchema: RuntimePromptSchema;
	modelOutputSchemaFor?(input: unknown): RuntimePromptSchema;
	outputPostcondition?: Readonly<{
		assert(input: unknown, output: unknown): void;
	}>;
	outputSchema: RuntimePromptSchema | null;
	projectInput?(input: unknown): unknown;
	projectOutput?(input: unknown, output: unknown): unknown;
	systemPrompt: string;
}>;

type RuntimePromptEntry = Readonly<{
	meta: Readonly<{ kind: "prompt" }>;
	prompt: RuntimePrompt;
}>;

type IntakeInput = Readonly<{
	items: readonly Readonly<{ id: string; sourceText: string }>[];
}>;

type TargetClassificationInput = Readonly<{
	clickedSegmentIndex: number;
	segments: readonly Readonly<{ kind: SegmentKind; text: string }>[];
}>;

type RuntimeProjectedPrompt<Input, ModelOutput, Result> = Prompt<
	RuntimePromptSchema<Input>,
	RuntimePromptSchema<ModelOutput>,
	Result,
	RuntimePromptSchema<unknown>
> & {
	projectOutput(input: Input, output: ModelOutput): Result;
};

type RuntimeDirectPrompt<Input, Output> = Prompt<
	RuntimePromptSchema<Input>,
	RuntimePromptSchema<Output>,
	Output,
	RuntimePromptSchema<unknown>
>;

type RuntimeCombinedGermanKnowledgePrompt = Omit<
	RuntimeProjectedPrompt<
		GermanKnowledgeGenerationInput,
		GermanKnowledgeAnalysis,
		GeneratedKnowledgeUpdate
	>,
	"modelOutputSchemaFor"
> & {
	modelOutputSchemaFor(
		input: GermanKnowledgeGenerationInput,
	): RuntimePromptSchema<GermanKnowledgeAnalysis>;
};

type RuntimePromptForPath<Path extends RuntimePromptPath> =
	Path extends "laboratory.intake"
		? RuntimeProjectedPrompt<IntakeInput, unknown, IntakeBatch>
		: Path extends "laboratory.targetClassification.de.highLevelWholeUnit"
			? RuntimeProjectedPrompt<
					TargetClassificationInput,
					unknown,
					AnalysisTarget | Unresolved
				>
			: Path extends `laboratory.grammaticalResolution.de.${string}`
				? RuntimeProjectedPrompt<
						GrammaticalResolutionInput,
						unknown,
						GrammaticalResolution
					>
				: Path extends "laboratory.readingResolution.de"
					? RuntimeDirectPrompt<
							ReadingInput,
							Readonly<{ emojiDescription: string }>
						>
					: Path extends "knowledge.de.combined"
						? RuntimeCombinedGermanKnowledgePrompt
						: RuntimeDirectPrompt<unknown, unknown>;

type RuntimePromptArtifact = Readonly<{
	dispatch: Readonly<{
		modelOutputSchemaFor?: string;
		outputPostcondition?: string;
		projectInput?: string;
		projectOutput?: string;
	}>;
	generationParams: Readonly<{ maxOutputTokens: number; model: string }>;
	jsonSchemaPayloads: Readonly<{
		input: string;
		modelInput: string;
		output: string | null;
	}>;
	path: string;
	systemPrompt: string;
	validationRoots: Readonly<{
		input: string;
		modelInput: string;
		output: string | null;
	}>;
}>;

type EncodedPromptArtifacts = Readonly<{
	offsetWidth: number;
	payloadBlob?: string;
	routeIndexPayload: string;
}>;

type PromptArtifactIndex = Readonly<{
	dispatchMask: number;
	end: number;
	start: number;
}>;

const DISPATCH_BITS = Object.freeze({
	modelOutputSchemaFor: 1,
	outputPostcondition: 2,
	projectInput: 4,
	projectOutput: 8,
});
const canonicalArtifactIndex = buildPromptArtifactIndex(
	encodedRuntimePromptArtifacts,
);
let materializedPromptRecords = 0;

export function runtimePromptMaterializationCount(): number {
	return materializedPromptRecords;
}

export function decodeRuntimePromptArtifact(
	path: string,
	encoded: EncodedPromptArtifacts = encodedRuntimePromptArtifacts,
): RuntimePromptArtifact {
	const index =
		encoded === encodedRuntimePromptArtifacts
			? canonicalArtifactIndex
			: buildPromptArtifactIndex(encoded);
	const location = index.get(path);
	if (location === undefined)
		throw new ReferenceError(`Unknown generated runtime prompt: ${path}.`);
	let parsed: unknown;
	const payloadBlob =
		encoded.payloadBlob ?? loadEncodedRuntimePromptData().promptPayloadBlob;
	assertPromptArtifactCoverage(index, payloadBlob.length);
	try {
		parsed = JSON.parse(payloadBlob.slice(location.start, location.end));
	} catch (cause) {
		throw new SyntaxError(`Corrupt runtime prompt payload for ${path}.`, {
			cause,
		});
	}
	assertRuntimePromptArtifact(parsed, path, location.dispatchMask);
	materializedPromptRecords += 1;
	return freezeRuntimePromptArtifact(parsed);
}

function buildPromptArtifactIndex(
	encoded: EncodedPromptArtifacts,
): ReadonlyMap<string, PromptArtifactIndex> {
	const width = encoded.offsetWidth;
	if (width !== 6 || !encoded.routeIndexPayload.startsWith("\n"))
		throw new SyntaxError("Corrupt runtime prompt route index header.");
	const index = new Map<string, PromptArtifactIndex>();
	let expectedStart = 0;
	for (const line of encoded.routeIndexPayload.slice(1).split("\n")) {
		const separator = line.indexOf("\0");
		const path = line.slice(0, separator);
		const metadata = line.slice(separator + 1);
		if (
			separator <= 0 ||
			metadata.length !== width * 2 + 2 ||
			!/^[0-9a-f]+$/u.test(metadata) ||
			index.has(path)
		)
			throw new SyntaxError("Corrupt runtime prompt route index entry.");
		const start = Number.parseInt(metadata.slice(0, width), 16);
		const end = Number.parseInt(metadata.slice(width, width * 2), 16);
		const dispatchMask = Number.parseInt(metadata.slice(width * 2), 16);
		if (
			start !== expectedStart ||
			end < start ||
			(dispatchMask & ~15) !== 0
		)
			throw new RangeError("Corrupt runtime prompt route index bounds.");
		index.set(path, Object.freeze({ dispatchMask, end, start }));
		expectedStart = end;
	}
	if (index.size === 0)
		throw new RangeError("Runtime prompt route index is empty.");
	return index;
}

function assertPromptArtifactCoverage(
	index: ReadonlyMap<string, PromptArtifactIndex>,
	payloadLength: number,
): void {
	const finalLocation = [...index.values()].at(-1);
	if (finalLocation === undefined || finalLocation.end !== payloadLength)
		throw new RangeError(
			"Runtime prompt route index does not cover its blob.",
		);
}

function assertRuntimePromptArtifact(
	value: unknown,
	path: string,
	dispatchMask: number,
): asserts value is RuntimePromptArtifact {
	const candidate = value as Partial<RuntimePromptArtifact> | null;
	if (
		candidate === null ||
		typeof candidate !== "object" ||
		candidate.path !== path ||
		typeof candidate.systemPrompt !== "string" ||
		candidate.dispatch === null ||
		typeof candidate.dispatch !== "object" ||
		candidate.generationParams === null ||
		typeof candidate.generationParams !== "object" ||
		candidate.jsonSchemaPayloads === null ||
		typeof candidate.jsonSchemaPayloads !== "object" ||
		candidate.validationRoots === null ||
		typeof candidate.validationRoots !== "object" ||
		typeof candidate.generationParams.maxOutputTokens !== "number" ||
		typeof candidate.generationParams.model !== "string" ||
		typeof candidate.jsonSchemaPayloads.input !== "string" ||
		typeof candidate.jsonSchemaPayloads.modelInput !== "string" ||
		(candidate.jsonSchemaPayloads.output !== null &&
			typeof candidate.jsonSchemaPayloads.output !== "string") ||
		typeof candidate.validationRoots.input !== "string" ||
		typeof candidate.validationRoots.modelInput !== "string" ||
		(candidate.validationRoots.output !== null &&
			typeof candidate.validationRoots.output !== "string")
	)
		throw new TypeError(`Corrupt runtime prompt record for ${path}.`);
	if (Object.keys(candidate.dispatch).some((key) => !(key in DISPATCH_BITS)))
		throw new TypeError(`Corrupt runtime prompt dispatch for ${path}.`);
	let actualMask = 0;
	for (const [key, bit] of Object.entries(DISPATCH_BITS)) {
		const dispatchId =
			candidate.dispatch[key as keyof typeof DISPATCH_BITS];
		if (dispatchId !== undefined) {
			if (typeof dispatchId !== "string")
				throw new TypeError(
					`Corrupt runtime prompt dispatch for ${path}.`,
				);
			actualMask |= bit;
		}
	}
	if (actualMask !== dispatchMask)
		throw new TypeError(
			`Runtime prompt dispatch mask drifted for ${path}.`,
		);
}

function freezeRuntimePromptArtifact(
	artifact: RuntimePromptArtifact,
): RuntimePromptArtifact {
	Object.freeze(artifact.dispatch);
	Object.freeze(artifact.generationParams);
	Object.freeze(artifact.jsonSchemaPayloads);
	Object.freeze(artifact.validationRoots);
	return Object.freeze(artifact);
}

function promptEntry<const Path extends RuntimePromptPath>(
	path: Path,
): PromptCatalogEntry<RuntimePromptForPath<Path>> {
	const location = canonicalArtifactIndex.get(path);
	if (location === undefined)
		throw new ReferenceError(`Unknown generated runtime prompt: ${path}.`);
	let artifact: RuntimePromptArtifact | undefined;
	let inputSchema: RuntimePromptSchema | undefined;
	let modelInputSchema: RuntimePromptSchema | undefined;
	let outputSchema: RuntimePromptSchema | null | undefined;
	const loadArtifact = () => (artifact ??= decodeRuntimePromptArtifact(path));
	const loadInputSchema = () =>
		(inputSchema ??= createRuntimePromptSchema(
			loadArtifact().validationRoots.input,
			loadArtifact().jsonSchemaPayloads.input,
		));
	const loadModelInputSchema = () =>
		(modelInputSchema ??= createRuntimePromptSchema(
			loadArtifact().validationRoots.modelInput,
			loadArtifact().jsonSchemaPayloads.modelInput,
		));
	const loadOutputSchema = (): RuntimePromptSchema | null => {
		if (outputSchema !== undefined) return outputSchema;
		const record = loadArtifact();
		outputSchema =
			record.jsonSchemaPayloads.output === null ||
			record.validationRoots.output === null
				? null
				: createRuntimePromptSchema(
						record.validationRoots.output,
						record.jsonSchemaPayloads.output,
					);
		return outputSchema;
	};
	const isCombinedKnowledge = path === "knowledge.de.combined";
	const hasDispatch = (bit: number) => (location.dispatchMask & bit) !== 0;
	const outputJsonSchema = () => loadOutputSchema()?.toJSONSchema();
	const entry: RuntimePromptEntry = Object.freeze({
		meta: Object.freeze({ kind: "prompt" as const }),
		prompt: Object.freeze({
			get generationParams() {
				return loadArtifact().generationParams;
			},
			get inputSchema() {
				return loadInputSchema();
			},
			get modelInputSchema() {
				return loadModelInputSchema();
			},
			...(hasDispatch(DISPATCH_BITS.projectInput)
				? {
						projectInput(input: unknown): unknown {
							const id = loadArtifact().dispatch.projectInput;
							assertDispatchId(id);
							return (
								runtimePromptDispatch(
									id,
									path,
									outputJsonSchema,
								) as (input: unknown) => unknown
							)(input);
						},
					}
				: {}),
			...(hasDispatch(DISPATCH_BITS.projectOutput)
				? {
						projectOutput(
							input: unknown,
							output: unknown,
						): unknown {
							const id = loadArtifact().dispatch.projectOutput;
							assertDispatchId(id);
							if (isCombinedKnowledge) {
								assertDispatchId(
									id,
									"knowledge.de.combined:project-output",
								);
								return projectGermanKnowledgeUpdate(
									input as GermanKnowledgeGenerationInput,
									output as GermanKnowledgeAnalysis,
								);
							}
							return (
								runtimePromptDispatch(
									id,
									path,
									outputJsonSchema,
								) as (
									input: unknown,
									output: unknown,
								) => unknown
							)(input, output);
						},
					}
				: {}),
			...(hasDispatch(DISPATCH_BITS.outputPostcondition)
				? {
						outputPostcondition: Object.freeze({
							assert(input: unknown, output: unknown): void {
								const id =
									loadArtifact().dispatch.outputPostcondition;
								assertDispatchId(id);
								if (isCombinedKnowledge) {
									assertDispatchId(
										id,
										"knowledge.de.combined:output-postcondition",
									);
									const schema = loadOutputSchema();
									if (schema === null)
										throw new TypeError(
											"Combined Knowledge output schema is missing.",
										);
									createRuntimeCombinedKnowledgeModelOutputSchema(
										input,
										schema,
									).parse(output);
									return;
								}
								(
									runtimePromptDispatch(
										id,
										path,
										outputJsonSchema,
									) as {
										assert(
											input: unknown,
											output: unknown,
										): void;
									}
								).assert(input, output);
							},
						}),
					}
				: {}),
			...(hasDispatch(DISPATCH_BITS.modelOutputSchemaFor)
				? {
						modelOutputSchemaFor(input: unknown) {
							const id =
								loadArtifact().dispatch.modelOutputSchemaFor;
							assertDispatchId(
								id,
								"knowledge.de.combined:model-output-schema",
							);
							const schema = loadOutputSchema();
							if (schema === null)
								throw new TypeError(
									"Combined Knowledge output schema is missing.",
								);
							return createRuntimeCombinedKnowledgeModelOutputSchema(
								input,
								schema,
							);
						},
					}
				: {}),
			get outputSchema() {
				return loadOutputSchema();
			},
			get systemPrompt() {
				return loadArtifact().systemPrompt;
			},
		}),
	});
	// The generated path inventory, parser parity suite, and dispatch allowlist
	// jointly bind each runtime descriptor to this closed path-to-contract map.
	return entry as unknown as PromptCatalogEntry<RuntimePromptForPath<Path>>;
}

function assertDispatchId(
	actual: string | undefined,
	expected?: string,
): asserts actual is string {
	if (actual === undefined || (expected !== undefined && actual !== expected))
		throw new ReferenceError(
			`Unknown runtime prompt dispatch: ${String(actual)}.`,
		);
}

export const RUNTIME_PROMPT_CATALOG = Object.freeze({
	laboratory: Object.freeze({
		intake: promptEntry("laboratory.intake"),
		targetClassification: Object.freeze({
			de: Object.freeze({
				highLevelWholeUnit: promptEntry(
					"laboratory.targetClassification.de.highLevelWholeUnit",
				),
			}),
		}),
		grammaticalResolution: Object.freeze({
			de: Object.freeze({
				Lexeme: Object.freeze({
					ADJ: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.ADJ",
					),
					ADP: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.ADP",
					),
					ADV: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.ADV",
					),
					AUX: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.AUX",
					),
					CCONJ: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.CCONJ",
					),
					DET: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.DET",
					),
					INTJ: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.INTJ",
					),
					NOUN: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.NOUN",
					),
					NUM: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.NUM",
					),
					PART: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.PART",
					),
					PRON: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.PRON",
					),
					PROPN: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.PROPN",
					),
					SCONJ: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.SCONJ",
					),
					SYM: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.SYM",
					),
					VERB: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.VERB",
					),
					X: promptEntry(
						"laboratory.grammaticalResolution.de.Lexeme.X",
					),
				}),
				Phraseme: Object.freeze({
					Aphorism: promptEntry(
						"laboratory.grammaticalResolution.de.Phraseme.Aphorism",
					),
					DiscourseFormula: promptEntry(
						"laboratory.grammaticalResolution.de.Phraseme.DiscourseFormula",
					),
					Idiom: promptEntry(
						"laboratory.grammaticalResolution.de.Phraseme.Idiom",
					),
					Proverb: promptEntry(
						"laboratory.grammaticalResolution.de.Phraseme.Proverb",
					),
				}),
				Construction: Object.freeze({
					Fusion: promptEntry(
						"laboratory.grammaticalResolution.de.Construction.Fusion",
					),
				}),
			}),
		}),
		readingResolution: Object.freeze({
			de: promptEntry("laboratory.readingResolution.de"),
		}),
		unitShadowClassification: promptEntry(
			"laboratory.unitShadowClassification",
		),
	}),
});

export const runtimeCombinedGermanKnowledgePrompt: PromptCatalogEntry<
	RuntimePromptForPath<"knowledge.de.combined">
> = promptEntry("knowledge.de.combined");
