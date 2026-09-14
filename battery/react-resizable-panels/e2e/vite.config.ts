import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const battery = (path: string) =>
	fileURLToPath(new URL(`../${path}`, import.meta.url));

/** Serves the browser harness against the battery's own source. */
export default defineConfig({
	root: fileURLToPath(new URL("./harness", import.meta.url)),
	plugins: [react()],
	resolve: {
		alias: [
			{
				find: "react-resizable-panels/workspace.css",
				replacement: battery("workspace/workspace.css"),
			},
			{
				find: "react-resizable-panels/workspace",
				replacement: battery("workspace/index.ts"),
			},
			{
				find: "react-resizable-panels",
				replacement: battery("lib/index.ts"),
			},
		],
	},
});
