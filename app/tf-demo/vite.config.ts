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
});
