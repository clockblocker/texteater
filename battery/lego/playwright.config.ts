import { defineConfig } from "@playwright/test";
import workspaceConfig from "../react-resizable-panels/playwright.config";

const harnessUrl = "http://127.0.0.1:4177";

export default defineConfig({
	...workspaceConfig,
	testDir: "./e2e",
	use: { ...workspaceConfig.use, baseURL: harnessUrl },
	webServer: {
		command:
			"bun run vite --config e2e/vite.config.ts --host 127.0.0.1 --port 4177",
		url: harnessUrl,
		reuseExistingServer: !process.env.CI,
	},
});
