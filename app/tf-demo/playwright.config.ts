import { defineConfig, devices } from "@playwright/test";

const playgroundUrl = "http://127.0.0.1:4175";

export default defineConfig({
	testDir: "./e2e",
	testMatch: "**/*.pw.ts",
	fullyParallel: false,
	workers: 1,
	timeout: 15_000,
	expect: { timeout: 3_000 },
	reporter: "line",
	use: {
		baseURL: playgroundUrl,
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: "bun run vite --host 127.0.0.1 --port 4175",
		url: playgroundUrl,
		reuseExistingServer: !process.env.CI,
		timeout: 30_000,
		stdout: "pipe",
		stderr: "pipe",
	},
});
