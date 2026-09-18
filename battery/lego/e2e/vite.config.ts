import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	root: fileURLToPath(new URL("./harness", import.meta.url)),
	plugins: [react(), tailwindcss()],
	resolve: {
		conditions: ["development"],
		dedupe: ["react", "react-dom"],
	},
});
