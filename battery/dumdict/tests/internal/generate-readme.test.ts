import { expect, test } from "bun:test";
import { runCodegen } from "dumcodegen";
import { readmeRecipe } from "../../generate-readme/generate-readme";

test("README recipe matches the committed README bytes", async () => {
	const result = await runCodegen(readmeRecipe, { mode: "check" });

	expect(result.status).toBe("clean");
});
