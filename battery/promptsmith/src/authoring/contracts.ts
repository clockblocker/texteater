import type { input, output, ZodType } from "zod";

export type PromptInputSchema = ZodType;
export type PromptOutputSchema = ZodType;

/** One cited source and the exact claim it supports for a Golden Case. */
type GoldenCaseSourceBase = {
	readonly title: string;
	readonly supports: string;
};

export type GoldenCaseSource = GoldenCaseSourceBase &
	(
		| { readonly url: string; readonly path?: never }
		| { readonly path: string; readonly url?: never }
	);

/**
 * One schema-bound semantic reference case. The containing registry key is its
 * stable ID. `explanation` is short authoring guidance, and `sources` records
 * optional evidence; neither is expected output. Contamination keys join
 * distinct inputs that exercise the same stimulus.
 */
export type GoldenCase<Input, Output> = {
	readonly input: Input;
	readonly idealOutput: Output;
	readonly explanation?: string;
	readonly sources?: readonly GoldenCaseSource[];
	readonly contaminationKeys?: readonly string[];
};

/** A route-local example that teaches exchange shape without claiming corpus evidence. */
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

/** A named, role-neutral group of cases within one semantic collection. */
export interface GoldenCaseGroup<
	Cases extends Readonly<Record<string, object>> = Readonly<
		Record<string, object>
	>,
> {
	readonly [goldenCaseGroupCases]: Cases;
}

export type GoldenCaseGroupRegistry = Readonly<Record<string, GoldenCaseGroup>>;

declare const goldenCaseCollectionDefinition: unique symbol;

/** A source-local semantic subdivision of one Golden Corpus. */
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

/** Ordered local examples parsed with the Prompt Source's exact schema instances. */
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

/**
 * An immutable ordered view over one Golden Corpus. Set operations preserve
 * corpus identity and deterministic order.
 */
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

/**
 * The canonical, schema-validated case registry for one prompt route.
 * Collections and groups describe semantics; selections assign consumer roles.
 */
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

/**
 * Projects a representation-neutral case into a private model exchange and
 * converts the private result back into the canonical semantic output.
 */
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

/**
 * The complete human-authored definition of one executable prompt route.
 * Schemas, body, corpus, and demonstrations share one route-local contract;
 * Prompt Assembly owns rendering.
 */
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

/** A Prompt Source, independent evaluation selection, and pure evaluator. */
export interface Experiment<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
	Result,
> {
	readonly promptSource: PromptSource<InputSchema, OutputSchema>;
	readonly evaluation: CaseSelection<InputSchema, OutputSchema>;
	readonly evaluator: ExperimentEvaluation<InputSchema, OutputSchema, Result>;
}
