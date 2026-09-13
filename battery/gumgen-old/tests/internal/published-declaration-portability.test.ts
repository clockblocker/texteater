import { describe, expect, test } from "bun:test";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";

const packageRoot = resolve(import.meta.dir, "../..");
const declarationRoot = resolve(packageRoot, "dist");

describe("published declaration portability", () => {
	test("names exported types without workspace-private package paths", async () => {
		const build = Bun.spawnSync(["bun", "run", "build:types"], {
			cwd: packageRoot,
			stderr: "pipe",
			stdout: "pipe",
		});
		expect(build.exitCode, build.stderr.toString()).toBe(0);

		for (const path of await declarationFiles(declarationRoot)) {
			const declaration = await Bun.file(path).text();
			expect(declaration).not.toMatch(
				/(?:node_modules[\\/].+[\\/]dist|(?:dumling|dumrel)[\\/]dist)[\\/]/u,
			);
		}
	});
});

async function declarationFiles(directory: string): Promise<string[]> {
	const paths: string[] = [];
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const path = resolve(directory, entry.name);
		if (entry.isDirectory()) paths.push(...(await declarationFiles(path)));
		else if (entry.name.endsWith(".d.ts")) paths.push(path);
	}
	return paths;
}
