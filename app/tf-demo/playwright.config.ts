import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.TF_DEMO_E2E_PORT ?? 4175);
const playgroundUrl = `http://127.0.0.1:${port}`;

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
		command: `bun run vite --host 127.0.0.1 --port ${port} --strictPort`,
		url: playgroundUrl,
		reuseExistingServer: !process.env.CI,
		timeout: 30_000,
		stdout: "pipe",
		stderr: "pipe",
	},
});
