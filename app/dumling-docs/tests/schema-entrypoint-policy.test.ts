import { expect, test } from "bun:test";
import { typedDocsGenerationConfig } from "../scripts/generate-content/docs/typed/config";
import { discoverTypedDocs } from "../scripts/generate-content/docs/typed/generate-typed-docs";

test("generated docs use current operations and concrete composable schemas", async () => {
	const docs = await discoverTypedDocs(typedDocsGenerationConfig);
	const rendered = docs.map(({ body }) => body).join("\n");
	expect(rendered).not.toMatch(
		/dumling-old|dangerouslyHeavy|surfaceKind|getLanguageApi|parseAsReading/,
	);
	expect(rendered).toContain('from "dumling/schema/de/lexeme/noun"');
	expect(rendered).toContain("parseUnit");
	expect(rendered).toContain("checkIfGrundform");
	expect(rendered).toContain('unitKind: "Attestation"');
});
