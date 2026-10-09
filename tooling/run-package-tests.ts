import { findTestFiles, planTestPasses } from "./lib/package-test-passes";

/**
 * Bun's 5 s default per-test timeout fails tests that take 1.5–2.5 s locally
 * once type-checks and other gates load the machine (#997). Bun 1.4.2 has no
 * bunfig timeout option, so every run gets it as a flag here. Tests that set
 * their own timeout keep it.
 */
const defaultTestTimeoutMs = 20_000;

// Bun shares one global object and module registry across a run's files, so
// DOM test files (`*.dom.test.tsx`) run in a second process and the main pass
// ignores them (#1135). Bun exits 1 when a pass, or a forwarded path, matches
// no test files, so a workspace that lost its tests (#999) turns the gate red.
const cwd = process.cwd();
const passes = planTestPasses(process.argv.slice(2), findTestFiles(cwd), cwd);
let exitCode = 0;
for (const args of passes) {
	const child = Bun.spawn(
		["bun", "test", "--timeout", String(defaultTestTimeoutMs), ...args],
		{
			cwd,
			env: process.env,
			stdin: "inherit",
			stdout: "inherit",
			stderr: "inherit",
		},
	);
	exitCode ||= await child.exited;
}
process.exitCode = exitCode;
