import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { playgroundFixtures } from "./tooling/playground-vite";

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss(), playgroundFixtures()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
		dedupe: ["react", "react-dom"],
	},
	/* Playwright's server holds still: an edit to the shared working tree
	   mid-run would otherwise hot-reload the page under a test */
	server: process.env.TF_DEMO_E2E ? { hmr: false, watch: null } : {},
});
