import { relative, resolve } from "node:path";
import { CodegenConfigurationError, CodegenInputError } from "./errors.js";
import type { CodegenFileSystem } from "./file-system.js";
import {
	compareCodeUnits,
	globToRegExp,
	isWithin,
	portablePath,
} from "./paths.js";
import type { Input, Inputs, MaterializedInputs, TextSource } from "./types.js";
import { deepFreeze, errorMessage, freezeArray } from "./values.js";

const decoder = new TextDecoder("utf-8", { fatal: true });

export async function materializeInputs<I extends Inputs>(
	inputs: I,
	fileSystem: CodegenFileSystem,
): Promise<Readonly<MaterializedInputs<I>>> {
	const materialized: Record<string, TextSource | readonly TextSource[]> = {};
	for (const key of Object.keys(inputs).toSorted()) {
		const input = inputs[key];
		if (input === undefined) {
			continue;
		}
		materialized[key] = await materializeInput(input, fileSystem);
	}
	return deepFreeze(materialized) as Readonly<MaterializedInputs<I>>;
}

async function materializeInput(
	input: Input,
	fileSystem: CodegenFileSystem,
): Promise<TextSource | readonly TextSource[]> {
	if (input.kind === "text") {
		const path = resolve(input.path);
		return readTextSource(path, fileSystem);
	}

	if (input.include.length === 0) {
		throw new CodegenConfigurationError(
			`Text-set input "${input.root}" must include at least one glob.`,
		);
	}

	const root = resolve(input.root);
	const recursive = input.recursive ?? false;
	const candidates = await fileSystem.listFiles(root, recursive);
	const include = input.include.map(globToRegExp);
	const exclude = (input.exclude ?? []).map(globToRegExp);
	const paths = candidates
		.map((path) => ({
			absolute: resolve(path),
			relative: portablePath(relative(root, resolve(path))),
		}))
		.filter(
			(candidate) =>
				isWithin(root, candidate.absolute) &&
				include.some((pattern) => pattern.test(candidate.relative)) &&
				!exclude.some((pattern) => pattern.test(candidate.relative)),
		)
		.toSorted((left, right) =>
			compareCodeUnits(left.relative, right.relative),
		);

	return freezeArray(
		await Promise.all(
			paths.map((candidate) =>
				readTextSource(candidate.absolute, fileSystem),
			),
		),
	);
}

async function readTextSource(
	path: string,
	fileSystem: CodegenFileSystem,
): Promise<TextSource> {
	let content: Uint8Array | undefined;
	try {
		content = await fileSystem.read(path);
	} catch (error) {
		throw new CodegenInputError(
			`Cannot read input "${path}": ${errorMessage(error)}`,
		);
	}
	if (content === undefined) {
		throw new CodegenInputError(`Input "${path}" does not exist.`);
	}
	try {
		return deepFreeze({
			source: { kind: "source" as const, path },
			text: decoder.decode(content),
		});
	} catch (error) {
		throw new CodegenInputError(
			`Input "${path}" is not valid UTF-8: ${errorMessage(error)}`,
		);
	}
}
