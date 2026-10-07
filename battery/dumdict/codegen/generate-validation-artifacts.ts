import { runCodegenCommand } from "codegen";
import { unitSchemasRecipe } from "./generate-unit-schemas.js";

// validation-artifacts.ts imports unit-schemas.ts, so write it first.
await runCodegenCommand(unitSchemasRecipe, { label: "Dumdict unit schemas" });
const { validationRecipe } = await import("./validation-artifacts.js");
await runCodegenCommand(validationRecipe(), {
	label: "Dumdict validation",
});
