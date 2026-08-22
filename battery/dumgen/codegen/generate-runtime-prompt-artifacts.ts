import { runCodegen } from "codegen";
import { runtimePromptArtifactRecipe } from "./runtime-prompt-artifacts.js";

const mode = process.argv.includes("--check") ? "check" : "write";
const result = await runCodegen(runtimePromptArtifactRecipe, { mode });

if (mode === "check" && result.status === "changed") {
	console.error(
		"Committed Dumgen runtime prompt artifacts are stale. Run the runtime prompt artifact generator.",
	);
	process.exitCode = 1;
} else {
	console.log(
		`Dumgen runtime prompt artifacts are ${result.status === "clean" ? "current" : "updated"}.`,
	);
}
