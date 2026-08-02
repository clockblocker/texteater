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

export type GoldenGroupTree = {
	readonly [key: string]: readonly string[] | GoldenGroupTree;
};

export type ResolvedGoldenGroups<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
	Groups extends GoldenGroupTree,
> = {
	readonly [Key in keyof Groups]: Groups[Key] extends readonly string[]
		? CaseSelection<InputSchema, OutputSchema>
		: Groups[Key] extends GoldenGroupTree
			? ResolvedGoldenGroups<InputSchema, OutputSchema, Groups[Key]>
			: never;
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
	Groups extends GoldenGroupTree = GoldenGroupTree,
> {
	readonly route: string;
	readonly inputSchema: InputSchema;
	readonly outputSchema: OutputSchema;
	readonly cases: Readonly<
		Record<string, ParsedGoldenCase<InputSchema, OutputSchema>>
	>;
	readonly groups: ResolvedGoldenGroups<InputSchema, OutputSchema, Groups>;
	select(ids: readonly string[]): CaseSelection<InputSchema, OutputSchema>;
	all(): CaseSelection<InputSchema, OutputSchema>;
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
