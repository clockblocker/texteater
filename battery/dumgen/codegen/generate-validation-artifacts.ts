import { runCodegen } from "codegen";
import { dumgenValidationArtifactRecipe } from "./validation-artifacts.js";

const mode = process.argv.includes("--check") ? "check" : "write";
const result = await runCodegen(dumgenValidationArtifactRecipe, { mode });

if (mode === "check" && result.status === "changed") {
	console.error(
		"Committed Dumgen validation artifacts are stale. Run `bun run generate:validation`.",
	);
	process.exitCode = 1;
} else {
	console.log(
		`Dumgen validation artifacts are ${result.status === "clean" ? "current" : "updated"}.`,
	);
}
