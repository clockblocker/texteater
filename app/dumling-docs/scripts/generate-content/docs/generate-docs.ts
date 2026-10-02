import { type RunMode, runCodegen } from "codegen";
import type { SourcePage } from "../shared/types";
import { defineDocsCodegen } from "./codegen";
import { discoverDocsInitialOwnership } from "./initial-ownership";
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

export async function generateDocs(
	mode: RunMode = "write",
): Promise<SourcePage[]> {
	const initialOwnership = discoverDocsInitialOwnership();
	const outputs = await discoverTypedDocs();
	assertUniqueRouteIds(outputs);
	// Generated docs are ignored build outputs, so check mode plans them without
	// comparing against whatever an earlier run left in this working tree.
	await runCodegen(defineDocsCodegen(outputs, initialOwnership), { mode });
	return outputs.map((output) => sourcePageFromDocsOutput(output));
}
