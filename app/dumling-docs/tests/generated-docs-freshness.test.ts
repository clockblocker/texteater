import { expect, test } from "bun:test";

import { generateDocs } from "../scripts/generate-content/docs/generate-docs";

test("typed documentation and committed generated stages are current", async () => {
	await expect(generateDocs("check")).resolves.toHaveLength(189);
});
