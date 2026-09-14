import { expect } from "bun:test";
import { build } from "esbuild";

const result = await build({
	stdin: {
		contents: `
			import { createDumdictService } from "./dist/runtime.js";
			import { derivePendingEntryId } from "./dist/pending.js";
			console.log(createDumdictService, derivePendingEntryId);
		`,
		resolveDir: new URL("..", import.meta.url).pathname,
	},
	bundle: true,
	format: "esm",
	logLevel: "silent",
	platform: "node",
	write: false,
});

expect(
	result.warnings.filter((warning) => warning.id === "ignored-bare-import"),
).toEqual([]);

process.stdout.write("Published dumdict build contract passed.\n");
