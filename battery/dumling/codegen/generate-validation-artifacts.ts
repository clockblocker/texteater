import { runCodegen } from "codegen";
import { dumlingValidationArtifactRecipe } from "./validation-artifacts.js";

const mode = process.argv.includes("--check") ? "check" : "write";
const result = await runCodegen(dumlingValidationArtifactRecipe, { mode });

if (mode === "check" && result.status === "changed") {
	console.error(
		"Committed Dumling validation artifacts are stale. Run `bun run generate:validation`.",
	);
	process.exitCode = 1;
} else {
	console.log(
		`Dumling validation artifacts are ${result.status === "clean" ? "current" : "updated"}.`,
	);
}
