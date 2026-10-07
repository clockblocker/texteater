/**
 * Bun's 5 s default per-test timeout fails tests that take 1.5–2.5 s locally
 * once type-checks and other gates load the machine (#997). Bun 1.4.2 has no
 * bunfig timeout option, so every run gets it as a flag here. Tests that set
 * their own timeout keep it.
 */
const defaultTestTimeoutMs = 20_000;

// Bun exits 1 when the run, or a forwarded path, matches no test files, so
// a workspace that lost its tests (#999) turns the gate red.
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
