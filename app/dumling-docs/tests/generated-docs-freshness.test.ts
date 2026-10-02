import { expect, test } from "bun:test";

import { generateDocs } from "../scripts/generate-content/docs/generate-docs";

test("typed documentation plans its generated pages in check mode", async () => {
	expect((await generateDocs("check")).length).toBeGreaterThan(0);
});
