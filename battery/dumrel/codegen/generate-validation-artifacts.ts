import { runCodegen } from "codegen";
import { dumrelValidationArtifactRecipe } from "./validation-artifacts.js";

const mode = process.argv.includes("--check") ? "check" : "write";
const result = await runCodegen(dumrelValidationArtifactRecipe, { mode });

if (mode === "check" && result.status === "changed") {
	console.error(
		"Committed Dumrel validation artifacts are stale. Run `bun run generate:validation`.",
	);
	process.exitCode = 1;
} else {
	console.log(
		`Dumrel validation artifacts are ${result.status === "clean" ? "current" : "updated"}.`,
	);
}
