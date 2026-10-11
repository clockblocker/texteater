import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 5173/5174 are tf-demo's Vite, 3210 its Convex backend.
export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
		dedupe: ["react", "react-dom"],
	},
	server: {
		host: "127.0.0.1",
		port: Number(process.env.PLAYGROUND_PORT ?? 5190),
		strictPort: true,
	},
});
