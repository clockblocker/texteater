import type { input, output, ZodType } from "zod";

export type PromptInputSchema = ZodType;
export type PromptOutputSchema = ZodType;

export type GoldenCase<Input, Output> = {
	readonly input: Input;
	readonly idealOutput: Output;
	readonly explanation?: string;
	readonly contaminationKeys?: readonly string[];
};

export type LocalDemonstration<Input, Output> = {
	readonly input: Input;
	readonly idealOutput: Output;
	readonly explanation?: string;
	readonly contaminationKeys?: readonly string[];
};

export type GoldenCaseRegistry<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
> = Readonly<
	Record<string, GoldenCase<input<InputSchema>, input<OutputSchema>>>
>;

declare const goldenCaseGroupCases: unique symbol;

export interface GoldenCaseGroup<
	Cases extends Readonly<Record<string, object>> = Readonly<
		Record<string, object>
	>,
> {
	readonly [goldenCaseGroupCases]: Cases;
}

export type GoldenCaseGroupRegistry = Readonly<Record<string, GoldenCaseGroup>>;

declare const goldenCaseCollectionDefinition: unique symbol;

export interface GoldenCaseCollection<
	Groups extends GoldenCaseGroupRegistry = GoldenCaseGroupRegistry,
	Cases extends Readonly<Record<string, object>> = Readonly<
		Record<string, object>
	>,
> {
	readonly [goldenCaseCollectionDefinition]: {
		readonly groups: Groups;
		readonly cases: Cases;
	};
}

export type GoldenCaseCollectionRegistry = Readonly<
	Record<string, GoldenCaseCollection>
>;

export type ParsedGoldenCase<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
> = GoldenCase<output<InputSchema>, output<OutputSchema>>;

export type ParsedLocalDemonstration<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
> = LocalDemonstration<output<InputSchema>, output<OutputSchema>>;

export interface LocalDemonstrations<
	InputSchema extends PromptInputSchema = PromptInputSchema,
	OutputSchema extends PromptOutputSchema = PromptOutputSchema,
> {
	readonly cases: readonly ParsedLocalDemonstration<
		InputSchema,
		OutputSchema
	>[];
}

type ResolvedGoldenGroups<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
	Collections extends GoldenCaseCollectionRegistry,
> = {
	readonly [CollectionName in keyof Collections]: Collections[CollectionName] extends GoldenCaseCollection<
		infer Groups,
		Readonly<Record<string, object>>
	>
		? {
				readonly [GroupName in keyof Groups]: CaseSelection<
					InputSchema,
					OutputSchema
				>;
			}
		: never;
};

type ResolvedGoldenCollections<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
	Collections extends GoldenCaseCollectionRegistry,
> = {
	readonly [CollectionName in keyof Collections]: CaseSelection<
		InputSchema,
		OutputSchema
	>;
};

export interface CaseSelection<
	InputSchema extends PromptInputSchema = PromptInputSchema,
	OutputSchema extends PromptOutputSchema = PromptOutputSchema,
> {
	readonly ids: readonly string[];
	readonly cases: readonly ParsedGoldenCase<InputSchema, OutputSchema>[];
	readonly isEmpty: boolean;
	has(caseId: string): boolean;
	union(
		other: CaseSelection<InputSchema, OutputSchema>,
	): CaseSelection<InputSchema, OutputSchema>;
	intersection(
		other: CaseSelection<InputSchema, OutputSchema>,
	): CaseSelection<InputSchema, OutputSchema>;
	difference(
		other: CaseSelection<InputSchema, OutputSchema>,
	): CaseSelection<InputSchema, OutputSchema>;
	isDisjointFrom(other: CaseSelection<InputSchema, OutputSchema>): boolean;
}

export interface GoldenCorpus<
	InputSchema extends PromptInputSchema = PromptInputSchema,
	OutputSchema extends PromptOutputSchema = PromptOutputSchema,
	Collections extends
		GoldenCaseCollectionRegistry = GoldenCaseCollectionRegistry,
> {
	readonly route: string;
	readonly inputSchema: InputSchema;
	readonly outputSchema: OutputSchema;
	readonly cases: Readonly<
		Record<string, ParsedGoldenCase<InputSchema, OutputSchema>>
	>;
	readonly collections: ResolvedGoldenCollections<
		InputSchema,
		OutputSchema,
		Collections
	>;
	readonly groups: ResolvedGoldenGroups<
		InputSchema,
		OutputSchema,
		Collections
	>;
	select(ids: readonly string[]): CaseSelection<InputSchema, OutputSchema>;
	all(): CaseSelection<InputSchema, OutputSchema>;
}

export interface PromptRepresentationAdapter<
	CanonicalInputSchema extends PromptInputSchema,
	CanonicalOutputSchema extends PromptOutputSchema,
	PrivateInputSchema extends PromptInputSchema,
	PrivateOutputSchema extends PromptOutputSchema,
> {
	materialize(
		goldenCase: ParsedGoldenCase<
			CanonicalInputSchema,
			CanonicalOutputSchema
		>,
	): {
		readonly input: input<PrivateInputSchema>;
		readonly idealOutput: input<PrivateOutputSchema>;
	};
	canonicalize(args: {
		readonly canonicalInput: output<CanonicalInputSchema>;
		readonly privateInput: output<PrivateInputSchema>;
		readonly output: output<PrivateOutputSchema>;
	}): output<CanonicalOutputSchema>;
}

export interface PromptSource<
	InputSchema extends PromptInputSchema = PromptInputSchema,
	OutputSchema extends PromptOutputSchema = PromptOutputSchema,
> {
	readonly route: string;
	readonly inputSchema: InputSchema;
	readonly outputSchema: OutputSchema;
	readonly body: string;
	readonly goldenCorpus?: GoldenCorpus<InputSchema, OutputSchema>;
	readonly demonstrations?:
		| LocalDemonstrations<InputSchema, OutputSchema>
		| CaseSelection<InputSchema, OutputSchema>;
}

export type ExperimentEvaluation<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
	Result,
> = (args: {
	readonly caseId: string;
	readonly input: output<InputSchema>;
	readonly idealOutput: output<OutputSchema>;
	readonly output: output<OutputSchema>;
}) => Result;

export interface Experiment<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
	Result,
> {
	readonly promptSource: PromptSource<InputSchema, OutputSchema>;
	readonly evaluation: CaseSelection<InputSchema, OutputSchema>;
	readonly evaluator: ExperimentEvaluation<InputSchema, OutputSchema, Result>;
}
