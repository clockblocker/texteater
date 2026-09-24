import { defineConfig, devices } from "@playwright/test";

const harnessUrl = "http://127.0.0.1:4177";

export default defineConfig({
	testDir: "./e2e",
	testMatch: "**/*.pw.ts",
	fullyParallel: false,
	workers: 1,
	timeout: 15_000,
	expect: { timeout: 3_000 },
	reporter: "line",
	use: {
		baseURL: harnessUrl,
		trace: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command:
			"bun run vite --config e2e/vite.config.ts --host 127.0.0.1 --port 4177",
		url: harnessUrl,
		reuseExistingServer: !process.env.CI,
	},
});
