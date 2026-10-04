import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/** Biome can need a second pass to settle long member chains. */
const maxFormattingPasses = 3;

const biome = fileURLToPath(
	new URL("../../../node_modules/@biomejs/biome/bin/biome", import.meta.url),
);

/**
 * Formats generated TypeScript with the repository's Biome settings, as if
 * it were the file at `path`, so a generated file passes `biome check`.
 * Repeats until Biome settles; throws if it does not.
 */
export async function formatTypeScript(
	source: string,
	path: URL,
): Promise<string> {
	let current = source;
	for (let pass = 0; pass < maxFormattingPasses; pass++) {
		const formatted = formatOnce(current, path);
		if (formatted === current) return formatted;
		current = formatted;
	}
	throw Error(
		`Biome did not settle on a format for ${fileURLToPath(path)} after ${maxFormattingPasses} passes`,
	);
}

function formatOnce(source: string, path: URL): string {
	const result = spawnSync(
		biome,
		[
			"check",
			"--write",
			"--linter-enabled=false",
			`--stdin-file-path=${fileURLToPath(path)}`,
		],
		{ encoding: "utf8", input: source, maxBuffer: 1024 * 1024 * 1024 },
	);
	if (result.error) throw result.error;
	if (result.status !== 0) throw Error(result.stderr);
	return result.stdout;
}
