export type Awaitable<T> = T | Promise<T>;

export type SourceProvenance = Readonly<{
	kind: "source";
	path: string;
	line?: number;
}>;

export type ArtifactProvenance = Readonly<{
	kind: "artifact";
	id: string;
}>;

export type Provenance = SourceProvenance | ArtifactProvenance;

export type TextSource = Readonly<{
	source: SourceProvenance;
	text: string;
}>;

export type TextInput = Readonly<{
	kind: "text";
	path: string;
}>;

export type TextSetInput = Readonly<{
	kind: "text-set";
	root: string;
	include: readonly string[];
	exclude?: readonly string[];
	recursive?: boolean;
}>;

export type Input = TextInput | TextSetInput;
export type Inputs = Readonly<Record<string, Input>>;

export type MaterializedInput<I extends Input> = I extends TextInput
	? TextSource
	: I extends TextSetInput
		? readonly TextSource[]
		: never;

export type MaterializedInputs<I extends Inputs> = {
	readonly [K in keyof I]: MaterializedInput<I[K]>;
};

export type Output = Readonly<{
	root: string;
	ownership?: Readonly<{
		/** Absolute, or relative to this output's root. */
		manifest: string;
		/**
		 * Files to adopt as previously owned when the manifest does not exist.
		 * Paths are relative to this output's root.
		 */
		initialFiles?: readonly string[];
	}>;
}>;

export type Outputs = Readonly<Record<string, Output>>;
export type OutputKey<O extends Outputs> = Extract<keyof O, string>;

type ArtifactDestination<Target extends string> = Readonly<{
	target: Target;
	path: string;
}>;

export type ArtifactDraft<
	Target extends string = string,
	Metadata = unknown,
> = Readonly<{
	id: string;
	to: ArtifactDestination<Target>;
	content: string | Uint8Array;
	provenance: readonly Provenance[];
	meta: Metadata;
}>;

export type PlannedArtifact<
	Target extends string = string,
	Metadata = unknown,
> = Readonly<{
	id: string;
	to: ArtifactDestination<Target>;
	destination: string;
	content: Uint8Array;
	digest: string;
	provenance: readonly Provenance[];
	meta: Metadata;
}>;

export type RecipeDefinition<
	I extends Inputs = Inputs,
	O extends Outputs = Outputs,
	Metadata = unknown,
> = Readonly<{
	inputs: I;
	outputs: O;
	build: (
		inputs: Readonly<MaterializedInputs<I>>,
	) => Awaitable<readonly ArtifactDraft<OutputKey<O>, Metadata>[]>;
	aggregate?: (
		primary: readonly PlannedArtifact<OutputKey<O>, Metadata>[],
	) => Awaitable<readonly ArtifactDraft<OutputKey<O>, Metadata>[]>;
}>;

export const recipeDefinition = Symbol("dumcodegen.recipe");

export type CodegenRecipe<
	I extends Inputs = Inputs,
	O extends Outputs = Outputs,
	Metadata = unknown,
> = Readonly<{
	[recipeDefinition]: RecipeDefinition<I, O, Metadata>;
}>;

export type PlannedChange = Readonly<{
	kind: "create" | "update" | "delete" | "unchanged";
	subject: "artifact" | "stale" | "manifest";
	target: string;
	path: string;
	destination: string;
	artifactId?: string;
}>;

export type ArtifactPlan<Metadata = unknown> = Readonly<{
	artifacts: readonly PlannedArtifact<string, Metadata>[];
	changes: readonly PlannedChange[];
}>;

export type RunMode = "check" | "write";

export type RunOptions = Readonly<{
	mode: RunMode;
}>;

export type CodegenRun<Metadata = unknown> = Readonly<{
	mode: RunMode;
	status: "clean" | "changed";
	plan: ArtifactPlan<Metadata>;
	applied: readonly PlannedChange[];
}>;

export type NamedBlockMarkdownOptions = Readonly<{
	template: string;
	snippets: Readonly<{
		root: string;
		include: readonly string[];
		exclude?: readonly string[];
		recursive?: boolean;
	}>;
	marker: string;
	fence: string;
	preamble: string;
	output: Readonly<{
		root: string;
		path: string;
	}>;
	unusedBlocks: "error" | "ignore";
}>;

export type NamedBlockMarkdownMetadata = Readonly<{
	preset: "named-block-markdown";
}>;
