import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const ignoredDirectories = new Set([".astro", ".git", "dist", "node_modules"]);
const testExtensions = new Set([".cjs", ".js", ".jsx", ".mjs", ".ts", ".tsx"]);

async function containsTests(dir: string): Promise<boolean> {
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		if (ignoredDirectories.has(entry.name)) continue;
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (await containsTests(path)) return true;
			continue;
		}
		if (
			testExtensions.has(extname(entry.name)) &&
			/(^|[._-])(test|spec)([._-]|$)/.test(entry.name)
		) {
			return true;
		}
	}
	return false;
}

if (!(await containsTests(process.cwd()))) {
	console.log("No test files found; nothing to run.");
	process.exit(0);
}

const child = Bun.spawn(["bun", "test"], {
	cwd: process.cwd(),
	env: process.env,
	stdin: "inherit",
	stdout: "inherit",
	stderr: "inherit",
});
process.exitCode = await child.exited;
