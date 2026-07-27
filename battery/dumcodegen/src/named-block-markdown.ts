import { CodegenInputError } from "./errors.js";
import { defineCodegen } from "./recipe.js";
import type {
	CodegenRecipe,
	NamedBlockMarkdownMetadata,
	NamedBlockMarkdownOptions,
	SourceProvenance,
	TextSource,
} from "./types.js";

export function namedBlockMarkdown(
	options: NamedBlockMarkdownOptions,
): CodegenRecipe<
	{
		template: { kind: "text"; path: string };
		snippets: {
			kind: "text-set";
			root: string;
			include: readonly string[];
			exclude?: readonly string[];
			recursive?: boolean;
		};
	},
	{ output: { root: string } },
	NamedBlockMarkdownMetadata
> {
	const marker = escapeRegExp(options.marker);
	const blockMarker = new RegExp(
		`^\\s*//\\s*${marker}:([a-z0-9-]+):(start|end)\\s*$`,
	);
	const templateMarker = new RegExp(
		`<!--\\s*${marker}:([a-z0-9-]+)\\s*-->`,
		"g",
	);

	return defineCodegen({
		inputs: {
			template: {
				kind: "text",
				path: options.template,
			},
			snippets: {
				kind: "text-set",
				root: options.snippets.root,
				include: options.snippets.include,
				exclude: options.snippets.exclude,
				recursive: options.snippets.recursive,
			},
		},
		outputs: {
			output: {
				root: options.output.root,
			},
		},
		build: ({ snippets, template }) => {
			const blocks = new Map<string, NamedBlock>();
			for (const source of snippets) {
				for (const [name, block] of extractBlocks(
					source,
					options.marker,
					blockMarker,
				)) {
					if (blocks.has(name)) {
						throw new CodegenInputError(
							`${options.marker} block "${name}" is defined more than once.`,
						);
					}
					blocks.set(name, block);
				}
			}

			const used = new Set<string>();
			const rendered = template.text.replaceAll(
				templateMarker,
				(_match, name: string) => {
					const block = blocks.get(name);
					if (block === undefined) {
						throw new CodegenInputError(
							`Missing ${options.marker} block "${name}".`,
						);
					}
					used.add(name);
					return `\`\`\`${options.fence}\n${block.content}\n\`\`\``;
				},
			);
			const unused = [...blocks.keys()]
				.filter((name) => !used.has(name))
				.toSorted();
			if (options.unusedBlocks === "error" && unused.length > 0) {
				throw new CodegenInputError(
					`Unused ${options.marker} blocks: ${unused.join(", ")}.`,
				);
			}

			const provenance: SourceProvenance[] = [
				template.source,
				...snippets.map((source) => source.source),
			];
			return [
				{
					id: "named-block-markdown",
					to: {
						target: "output",
						path: options.output.path,
					},
					content: `${`${options.preamble}${rendered}`.trimEnd()}\n`,
					provenance,
					meta: {
						preset: "named-block-markdown",
					},
				},
			];
		},
	});
}

type NamedBlock = Readonly<{
	content: string;
	source: SourceProvenance;
}>;

function extractBlocks(
	source: TextSource,
	marker: string,
	pattern: RegExp,
): ReadonlyMap<string, NamedBlock> {
	const blocks = new Map<string, NamedBlock>();
	const lines = source.text.split("\n");
	let activeName: string | undefined;
	let activeLine = -1;
	let activeLines: string[] = [];

	for (const [index, line] of lines.entries()) {
		const match = pattern.exec(line);
		if (match === null) {
			if (activeName !== undefined) {
				activeLines.push(line);
			}
			continue;
		}

		const name = match[1];
		const kind = match[2];
		if (name === undefined || (kind !== "start" && kind !== "end")) {
			throw new CodegenInputError(
				`Invalid ${marker} marker in ${source.source.path}:${index + 1}.`,
			);
		}
		if (kind === "start") {
			if (activeName !== undefined) {
				throw new CodegenInputError(
					`Nested ${marker} block "${name}" in ${source.source.path}:${index + 1}.`,
				);
			}
			if (blocks.has(name)) {
				throw new CodegenInputError(
					`Duplicate ${marker} block "${name}" in ${source.source.path}:${index + 1}.`,
				);
			}
			activeName = name;
			activeLine = index + 1;
			activeLines = [];
			continue;
		}
		if (activeName !== name) {
			throw new CodegenInputError(
				`Unexpected ${marker} block end "${name}" in ${source.source.path}:${index + 1}.`,
			);
		}
		blocks.set(
			name,
			Object.freeze({
				content: activeLines.join("\n").trim(),
				source: Object.freeze({
					kind: "source",
					path: source.source.path,
					line: activeLine,
				}),
			}),
		);
		activeName = undefined;
		activeLine = -1;
		activeLines = [];
	}

	if (activeName !== undefined) {
		throw new CodegenInputError(
			`Unclosed ${marker} block "${activeName}" in ${source.source.path}:${activeLine}.`,
		);
	}
	return blocks;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
