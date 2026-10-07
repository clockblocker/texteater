import { readdir } from "node:fs/promises";
import { extname, join } from "node:path";

/**
 * Bun's 5 s default per-test timeout fails tests that take 1.5–2.5 s locally
 * once type-checks and other gates load the machine (#997). Bun 1.4.2 has no
 * bunfig timeout option, so every run gets it as a flag here. Tests that set
 * their own timeout keep it.
 */
const defaultTestTimeoutMs = 20_000;
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

// Every workspace has tests (#999), so finding none means a workspace lost
// them; that turns the gate red instead of passing silently.
if (!(await containsTests(process.cwd()))) {
	console.error(
		`No test files found under ${process.cwd()}. Every workspace's test script must run at least one *.test or *.spec file.`,
	);
	process.exit(1);
}

const child = Bun.spawn(
	[
		"bun",
		"test",
		"--timeout",
		String(defaultTestTimeoutMs),
		...process.argv.slice(2),
	],
	{
		cwd: process.cwd(),
		env: process.env,
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	},
);
process.exitCode = await child.exited;
