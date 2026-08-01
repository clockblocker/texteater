import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [tailwindcss()],
	resolve: {
		alias: {
			"@": new URL("./src", import.meta.url).pathname,
		},
	},
	build: {
		outDir: "dist/client",
	},
	server: {
		host: "127.0.0.1",
		port: 5173,
		proxy: {
			"/api": "http://127.0.0.1:3100",
		},
	},
});
