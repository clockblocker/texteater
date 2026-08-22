import { expect, test } from "bun:test";
import { typedDocsGenerationConfig } from "../scripts/generate-content/docs/typed/config";
import { discoverTypedDocs } from "../scripts/generate-content/docs/typed/generate-typed-docs";

test("generated docs name route-specific schema access as a danger-zone escape hatch", async () => {
	const docs = await discoverTypedDocs(typedDocsGenerationConfig);
	const rendered = docs.map(({ body }) => body).join("\n");

	expect(rendered).not.toContain("schemasFor.");
	expect(rendered).not.toContain("getSchemaTreeFor(");
	expect(rendered).toContain("dangerouslyHeavySchemasForAbout100MiBRss");
	expect(rendered).toContain(
		"getDangerouslyHeavySchemaTreeForAbout100MiBRss",
	);
	expect(rendered).toContain("parseAsReading");
});
