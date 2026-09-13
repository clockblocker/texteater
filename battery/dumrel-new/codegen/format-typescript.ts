import { fileURLToPath } from "node:url";

export async function formatTypeScript(
	source: string,
	path: URL,
): Promise<string> {
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
