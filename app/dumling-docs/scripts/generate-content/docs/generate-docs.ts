import { runCodegen } from "dumcodegen";
import type { SourcePage } from "../shared/types";
import { defineDocsCodegen } from "./codegen";
import { discoverDocsInitialOwnership } from "./initial-ownership";
import { typedDocsGenerationConfig } from "./typed/config";
import { discoverTypedDocs } from "./typed/generate-typed-docs";
import type { DocsOutput } from "./types";
import { sourcePageFromDocsOutput } from "./types";

function assertUniqueRouteIds(outputs: DocsOutput[]): void {
	const routeIds = new Map<string, string>();

	for (const output of outputs) {
		const existing = routeIds.get(output.routeId);
		if (existing !== undefined) {
			throw new Error(
				`Docs routeId collision: ${existing} and ${output.sourcePath} both resolve to ${output.routeId}.`,
			);
		}
		routeIds.set(output.routeId, output.sourcePath);
	}
}

export async function generateDocs(): Promise<SourcePage[]> {
	const initialOwnership = discoverDocsInitialOwnership();
	const outputs = await discoverTypedDocs(typedDocsGenerationConfig);
	assertUniqueRouteIds(outputs);
	await runCodegen(defineDocsCodegen(outputs, initialOwnership), {
		mode: "write",
	});
	return outputs.map((output) => sourcePageFromDocsOutput(output));
}
