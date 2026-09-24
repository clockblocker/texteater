import { fileURLToPath } from "node:url";

/** Biome can need a second pass to settle long member chains. */
const maxFormattingPasses = 3;

export async function formatTypeScript(
	source: string,
	path: URL,
): Promise<string> {
	let current = source;
	for (let pass = 0; pass < maxFormattingPasses; pass++) {
		const formatted = await formatOnce(current, path);
		if (formatted === current) return formatted;
		current = formatted;
	}
	throw Error(
		`Biome did not settle on a format for ${fileURLToPath(path)} after ${maxFormattingPasses} passes`,
	);
}

async function formatOnce(source: string, path: URL): Promise<string> {
	const formatter = Bun.spawn(
		[
			fileURLToPath(
				new URL(
					"../../../node_modules/@biomejs/biome/bin/biome",
					import.meta.url,
				),
			),
			"check",
			"--write",
			"--linter-enabled=false",
			`--stdin-file-path=${fileURLToPath(path)}`,
		],
		{ stdin: "pipe", stdout: "pipe", stderr: "pipe" },
	);
	formatter.stdin.write(source);
	formatter.stdin.end();
	const [output, error, exit] = await Promise.all([
		new Response(formatter.stdout).text(),
		new Response(formatter.stderr).text(),
		formatter.exited,
	]);
	if (exit) throw Error(error);
	return output;
}
