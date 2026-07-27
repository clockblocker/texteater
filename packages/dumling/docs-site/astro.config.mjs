import { defineConfig } from "astro/config";

export default defineConfig({
	output: "static",
	outDir: "./dist",
	publicDir: "./public",
	srcDir: "./src",
});
