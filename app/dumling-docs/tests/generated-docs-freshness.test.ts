import { expect, test } from "bun:test";
import { runCodegen } from "codegen";

import { definePagesCodegen } from "../scripts/generate-content/docs/codegen";
import { discoverTypedDocs } from "../scripts/generate-content/docs/typed/generate-typed-docs";

test("typed documentation plans its generated pages in check mode", async () => {
	const docs = await discoverTypedDocs();
	const result = await runCodegen(definePagesCodegen("docs", docs), {
		mode: "check",
	});

	expect(docs.length).toBeGreaterThan(0);
	expect(result.applied).toEqual([]);
	expect(result.plan.artifacts.map((artifact) => artifact.to.path)).toEqual(
		expect.arrayContaining(["index.md", "nav.json", "nav.md"]),
	);
	expect(result.plan.artifacts).toHaveLength(docs.length * 2 + 2);
});
