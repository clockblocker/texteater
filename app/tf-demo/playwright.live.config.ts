import { defineConfig, devices } from "@playwright/test";

if (!process.argv.includes("--list") && !process.env.TF_DEMO_LIVE_RUN) {
	throw new Error(
		"Run bun run test:pipeline:live and authorize the live generation first.",
	);
}

export default defineConfig({
	testDir: "./live-pipeline",
	testMatch: "**/*.live.ts",
	workers: 1,
	fullyParallel: false,
	retries: 0,
	repeatEach: 1,
	timeout: 180_000,
	expect: { timeout: 10_000 },
	reporter: "line",
	outputDir: "test-results/live-pipeline",
	use: {
		...devices["Desktop Chrome"],
		baseURL: process.env.TF_DEMO_LIVE_APP_URL,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
});
