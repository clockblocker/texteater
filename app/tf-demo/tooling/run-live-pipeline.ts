import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

const appUrl = process.env.TF_DEMO_LIVE_APP_URL ?? "http://localhost:5173";
const convexUrl =
	process.env.TF_DEMO_LIVE_CONVEX_URL ?? "http://127.0.0.1:3210";
const args = process.argv.slice(2);
if (args.includes("--help")) {
	console.log(`Usage: bun run test:pipeline:live [--list]

One Aufstieg probe through real segmentation, a browser click, scheduled
resolution, dictionary commit and Reading Note rendering. Requires running
tf-demo and Convex servers with provider credentials configured in Convex.

TF_DEMO_LIVE_APP_URL     App URL (default ${appUrl})
TF_DEMO_LIVE_CONVEX_URL  Matching Convex URL (default ${convexUrl})

Every execution requires interactive authorization. It incurs model costs and
adds a uniquely keyed probe Text and its analysis to the selected database.
It never resets the database. Results remain for inspection. Existing resolved
occurrences cannot count as a fresh generation. No retries or CI execution.
--list lists the single test without authorization, network calls or generation.`);
	process.exit(0);
}
if (args.some((arg) => arg !== "--list"))
	throw new Error("Use --help for supported options.");
const listOnly = args.includes("--list");
if (!listOnly) {
	if (process.env.CI || !process.stdin.isTTY || !process.stdout.isTTY) {
		throw new Error(
			"Live generation requires a human-authorized interactive terminal; use --list to inspect the suite.",
		);
	}
	console.log(
		`Live Aufstieg pipeline\nApp: ${appUrl}\nConvex: ${convexUrl}\nThis run calls the model and writes probe data. Data will be retained.`,
	);
	const prompt = createInterface({
		input: process.stdin,
		output: process.stdout,
	});
	try {
		const answer = await prompt.question(
			'Type "AUTHORIZE Aufstieg" to run once: ',
		);
		if (answer !== "AUTHORIZE Aufstieg")
			throw new Error("Live run was not authorized.");
	} finally {
		prompt.close();
	}
}
const child = Bun.spawn(
	[
		"bunx",
		"playwright",
		"test",
		"--config",
		"playwright.live.config.ts",
		...args,
	],
	{
		cwd: fileURLToPath(new URL("..", import.meta.url)),
		env: {
			...process.env,
			TF_DEMO_LIVE_APP_URL: appUrl,
			TF_DEMO_LIVE_CONVEX_URL: convexUrl,
			TF_DEMO_LIVE_RUN: listOnly ? "" : randomUUID(),
		},
		stdin: "inherit",
		stdout: "inherit",
		stderr: "inherit",
	},
);
process.exitCode = await child.exited;
