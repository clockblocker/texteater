import { readdir } from "node:fs/promises";
import { join, relative } from "node:path";
import type { CodegenRecipe } from "codegen";
import { defineCodegen, runCodegen } from "codegen";
import { assembleSystemPrompt } from "./assemble-system-prompt";
import type {
	CaseSelection,
	PromptInputSchema,
	PromptOutputSchema,
	PromptSource,
} from "./contracts";
import { selectedCaseSourcePaths, tryGetSelectionState } from "./golden-corpus";

export type SystemPromptRecipe = CodegenRecipe<
	Record<never, never>,
	{ readonly generated: { readonly root: string } },
	{ readonly route: string }
>;

type AnyPromptSource = PromptSource<PromptInputSchema, PromptOutputSchema>;

type PromptSourceRoot = string | ((source: AnyPromptSource) => string);

export function defineSystemPromptCodegen(args: {
	readonly promptSources: readonly AnyPromptSource[];
	readonly promptSourceRoot: PromptSourceRoot;
	readonly generatedRoot: string;
	readonly displayRoot: string;
	readonly artifactIdPrefix: string;
	readonly generatedBy: string;
	readonly sourceLabel?: string;
	readonly staleLabel: string;
	readonly expectedRouteEntries?: (
		source: AnyPromptSource,
	) => readonly string[] | undefined;
	readonly provenancePaths?: (
		source: AnyPromptSource,
	) => readonly string[] | undefined;
}): {
	readonly recipe: SystemPromptRecipe;
	run(argv?: readonly string[]): Promise<void>;
} {
	const recipe: SystemPromptRecipe = defineCodegen<
		Record<never, never>,
		{ readonly generated: { readonly root: string } },
		{ readonly route: string }
	>({
		inputs: {},
		outputs: { generated: { root: args.generatedRoot } },
		async build() {
			await assertPromptSourceLayout(args);
			return args.promptSources.map((source) => ({
				id: `${args.artifactIdPrefix}:${source.route}`,
				to: {
					target: "generated" as const,
					path: `${source.route}.ts`,
				},
				content: renderModule(
					args.generatedBy,
					assembleSystemPrompt(source),
				),
				provenance: promptSourceProvenance(
					args.promptSourceRoot,
					source,
					args.provenancePaths,
				),
				meta: { route: source.route },
			}));
		},
	});

	return Object.freeze({
		recipe,
		async run(argv: readonly string[] = process.argv) {
			const mode = argv.includes("--check") ? "check" : "write";
			const result = await runCodegen(recipe, { mode });
			if (mode === "check" && result.status === "changed") {
				const stale = result.plan.changes
					.filter((change) => change.kind !== "unchanged")
					.map((change) =>
						relative(args.displayRoot, change.destination),
					);
				console.error(`${args.staleLabel}: ${stale.join(", ")}`);
				process.exitCode = 1;
			}
		},
	});
}

async function assertPromptSourceLayout(args: {
	readonly promptSources: readonly AnyPromptSource[];
	readonly promptSourceRoot: PromptSourceRoot;
	readonly sourceLabel?: string;
	readonly expectedRouteEntries?: (
		source: AnyPromptSource,
	) => readonly string[] | undefined;
}): Promise<void> {
	for (const source of args.promptSources) {
		const directory = join(
			resolvePromptSourceRoot(args.promptSourceRoot, source),
			source.route,
		);
		let actualFiles: string[];
		try {
			actualFiles = (await readdir(directory, { withFileTypes: true }))
				.map((entry) => entry.name)
				.toSorted();
		} catch (cause) {
			throw new Error(
				`${args.sourceLabel ?? "Prompt Source"} "${source.route}" cannot be read at ${directory}.`,
				{ cause },
			);
		}
		const expectedFiles = (
			args.expectedRouteEntries?.(source) ?? [
				...(source.goldenCorpus === undefined ? [] : ["golden-corpus"]),
				"prompt-source.ts",
				"schemas.ts",
			]
		).toSorted();
		if (actualFiles.join("\n") !== expectedFiles.join("\n")) {
			throw new Error(
				`${args.sourceLabel ?? "Prompt Source"} "${source.route}" must contain exactly ${expectedFiles.join(", ")}; found ${actualFiles.join(", ") || "no files"}.`,
			);
		}
	}
}

function promptSourceProvenance(
	promptSourceRoot: PromptSourceRoot,
	source: AnyPromptSource,
	provenancePaths?: (
		source: AnyPromptSource,
	) => readonly string[] | undefined,
): readonly { readonly kind: "source"; readonly path: string }[] {
	const customProvenancePaths = provenancePaths?.(source);
	if (customProvenancePaths !== undefined) {
		return customProvenancePaths.map((path) => ({
			kind: "source",
			path,
		}));
	}
	const routeRoot = join(
		resolvePromptSourceRoot(promptSourceRoot, source),
		source.route,
	);
	const selected =
		source.demonstrations === undefined
			? undefined
			: tryGetSelectionState(source.demonstrations);
	const paths = [
		join(routeRoot, "prompt-source.ts"),
		join(routeRoot, "schemas.ts"),
		...(selected === undefined
			? []
			: [
					join(routeRoot, "golden-corpus", "corpus.ts"),
					...selectedCaseSourcePaths(
						source.demonstrations as CaseSelection,
					),
				]),
	];
	return paths.map((path) => ({ kind: "source", path }));
}

function resolvePromptSourceRoot(
	promptSourceRoot: PromptSourceRoot,
	source: AnyPromptSource,
): string {
	return typeof promptSourceRoot === "function"
		? promptSourceRoot(source)
		: promptSourceRoot;
}

function renderModule(generatedBy: string, systemPrompt: string): string {
	const literal = systemPrompt
		.replaceAll("\\", "\\\\")
		.replaceAll("'", "\\'")
		.replaceAll("\r", "\\r")
		.replaceAll("\n", "\\n")
		.replaceAll("\t", "\\t")
		.replaceAll("\u2028", "\\u2028")
		.replaceAll("\u2029", "\\u2029");
	return `// Generated by ${generatedBy}. Do not edit.\n\nexport const systemPrompt =\n\t'${literal}';\n`;
}
