import { defineConfig } from "vite";

export default defineConfig({
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
