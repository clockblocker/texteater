import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const serverPort = Number(process.env.EFFECT_PLAYGROUND_SERVER_PORT ?? 5201);
const target = `http://127.0.0.1:${serverPort}`;

// 5173/5174 are tf-demo's Vite, 5190 the playground's.
export default defineConfig({
	plugins: [react()],
	server: {
		host: "127.0.0.1",
		port: Number(process.env.EFFECT_PLAYGROUND_PORT ?? 5200),
		strictPort: true,
		proxy: { "/api": target, "/rpc": target },
	},
});
