import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BLOCK_NAME_PATTERN = "[a-z0-9-]+";

type MarkerKind = "start" | "end";

interface MarkerOptions {
	markerPrefix: string;
}

interface CollectBlocksFromDirectoryOptions extends MarkerOptions {
	examplesDir: string;
}

interface RenderMarkdownTemplateOptions extends MarkerOptions {
	allowUnusedBlocks?: boolean;
	blocks: Map<string, string>;
	fence?: string;
	templateText: string;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function blockMarkerPattern(markerPrefix: string): RegExp {
	return new RegExp(
		`^\\s*//\\s*${escapeRegExp(markerPrefix)}:(${BLOCK_NAME_PATTERN}):(start|end)\\s*$`,
	);
}

function templateMarkerPattern(markerPrefix: string): RegExp {
	return new RegExp(
		`<!--\\s*${escapeRegExp(markerPrefix)}:(${BLOCK_NAME_PATTERN})\\s*-->`,
		"g",
	);
}

export function extractBlocksFromSource(
	sourceText: string,
	filePath: string,
	options: MarkerOptions,
): Map<string, string> {
	const blocks = new Map<string, string>();
	const markerPattern = blockMarkerPattern(options.markerPrefix);
	const lines = sourceText.split("\n");
	let activeBlockName: string | null = null;
	let activeBlockStartLine = -1;
	let activeBlockLines: string[] = [];

	for (const [index, line] of lines.entries()) {
		const markerMatch = markerPattern.exec(line);
		if (!markerMatch) {
			if (activeBlockName !== null) {
				activeBlockLines.push(line);
			}
			continue;
		}

		const blockName = markerMatch[1];
		const markerKind = markerMatch[2] as MarkerKind | undefined;
		if (blockName === undefined || markerKind === undefined) {
			throw new Error(
				`Invalid ${options.markerPrefix} marker in ${filePath}:${index + 1}.`,
			);
		}

		if (markerKind === "start") {
			if (activeBlockName !== null) {
				throw new Error(
					`Nested ${options.markerPrefix} block "${blockName}" in ${filePath}:${index + 1}.`,
				);
			}
			if (blocks.has(blockName)) {
				throw new Error(
					`Duplicate ${options.markerPrefix} block "${blockName}" in ${filePath}:${index + 1}.`,
				);
			}
			activeBlockName = blockName;
			activeBlockStartLine = index + 1;
			activeBlockLines = [];
			continue;
		}

		if (activeBlockName !== blockName) {
			throw new Error(
				`Unexpected ${options.markerPrefix} block end "${blockName}" in ${filePath}:${index + 1}.`,
			);
		}

		const blockText = activeBlockLines.join("\n").trim();
		blocks.set(blockName, blockText);
		activeBlockName = null;
		activeBlockStartLine = -1;
		activeBlockLines = [];
	}

	if (activeBlockName !== null) {
		throw new Error(
			`Unclosed ${options.markerPrefix} block "${activeBlockName}" in ${filePath}:${activeBlockStartLine}.`,
		);
	}

	return blocks;
}

export function collectBlocksFromDirectory(
	options: CollectBlocksFromDirectoryOptions,
): Map<string, string> {
	const blockEntries = new Map<string, string>();
	const exampleFiles = readdirSync(options.examplesDir)
		.filter((fileName) => fileName.endsWith(".ts"))
		.sort();

	for (const fileName of exampleFiles) {
		const filePath = join(options.examplesDir, fileName);
		const fileBlocks = extractBlocksFromSource(
			readFileSync(filePath, "utf8"),
			filePath,
			options,
		);

		for (const [blockName, blockText] of fileBlocks) {
			if (blockEntries.has(blockName)) {
				throw new Error(
					`${options.markerPrefix} block "${blockName}" is defined more than once.`,
				);
			}
			blockEntries.set(blockName, blockText);
		}
	}

	return blockEntries;
}

export function renderMarkdownTemplate(
	options: RenderMarkdownTemplateOptions,
): string {
	const usedBlocks = new Set<string>();
	const markerPattern = templateMarkerPattern(options.markerPrefix);
	const fence = options.fence ?? "ts";
	const renderedTemplate = options.templateText.replaceAll(
		markerPattern,
		(_, blockName: string) => {
			const block = options.blocks.get(blockName);
			if (block === undefined) {
				throw new Error(
					`Missing ${options.markerPrefix} block "${blockName}".`,
				);
			}
			usedBlocks.add(blockName);
			return `\`\`\`${fence}\n${block}\n\`\`\``;
		},
	);
	const unusedBlocks = [...options.blocks.keys()].filter(
		(blockName) => !usedBlocks.has(blockName),
	);

	if (unusedBlocks.length > 0 && options.allowUnusedBlocks !== true) {
		throw new Error(
			`Unused ${options.markerPrefix} blocks: ${unusedBlocks.toSorted().join(", ")}.`,
		);
	}

	return renderedTemplate;
}
