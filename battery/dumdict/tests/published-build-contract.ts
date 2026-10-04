import { expect } from "bun:test";
import { build } from "esbuild";

const result = await build({
	stdin: {
		contents: `
			import { createDumdictPlanner } from "./dist/planning.js";
			import { derivePendingEntryId } from "./dist/pending.js";
			console.log(createDumdictPlanner, derivePendingEntryId);
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
