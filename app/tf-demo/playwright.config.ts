import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.TF_DEMO_E2E_PORT ?? 4175);
const playgroundUrl = `http://127.0.0.1:${port}`;

/* Specs that open only `/playground/...` and read no Convex data. CI runs
   them as its `e2e` gate (`bun run test:e2e:playground`); every other spec
   opens `/` against a seeded local Convex backend and stays local (#901).
   `app-provider.tsx` throws without `VITE_CONVEX_URL` on every route, so
   that script sets a placeholder (process env wins over `.env.local`). */
const playgroundSpecs = [
	"compass.pw.ts",
	"deck-motion.pw.ts",
	"playground-isolation.pw.ts",
];

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
			name: "playground",
			testMatch: playgroundSpecs,
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "convex-backed",
			testIgnore: playgroundSpecs,
			use: { ...devices["Desktop Chrome"] },
		},
	],
	webServer: {
		command: `bun run vite --host 127.0.0.1 --port ${port} --strictPort`,
		env: { TF_DEMO_E2E: "1" },
		url: playgroundUrl,
		reuseExistingServer: !process.env.CI,
		timeout: 30_000,
		stdout: "pipe",
		stderr: "pipe",
	},
});
