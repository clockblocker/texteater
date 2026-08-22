import { runCodegen } from "codegen";
import { dumdictValidationArtifactRecipe } from "./validation-artifacts.js";

const mode = process.argv.includes("--check") ? "check" : "write";
const result = await runCodegen(dumdictValidationArtifactRecipe, { mode });

if (mode === "check" && result.status === "changed") {
	console.error(
		"Committed Dumdict validation artifacts are stale. Run `bun run generate:validation`.",
	);
	process.exitCode = 1;
} else {
	console.log(
		`Dumdict validation artifacts are ${result.status === "clean" ? "current" : "updated"}.`,
	);
}
