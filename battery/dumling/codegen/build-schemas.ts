import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const source = new URL("../src/generated/schemas/", import.meta.url);
const entryPoints = (await readdir(source, { recursive: true }))
	.filter((file) => file.endsWith(".ts"))
	.map((file) => fileURLToPath(new URL(file, source)));

await build({
	entryPoints,
	outbase: fileURLToPath(source),
	outdir: fileURLToPath(
		new URL("../dist/generated/schemas/", import.meta.url),
	),
	bundle: true,
	platform: "node",
	format: "esm",
	packages: "external",
	minifySyntax: true,
	minifyWhitespace: true,
});
