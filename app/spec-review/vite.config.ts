import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const apiPort = process.env.SPEC_REVIEW_API_PORT ?? "3186";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		dedupe: ["react", "react-dom"],
	},
	build: {
		outDir: "dist/client",
	},
	server: {
		host: "127.0.0.1",
		port: Number(process.env.SPEC_REVIEW_PORT ?? 5186),
		strictPort: true,
		proxy: {
			"/api": `http://127.0.0.1:${apiPort}`,
		},
	},
});
