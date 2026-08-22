import { type RunMode, runCodegen } from "codegen";
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

export async function generateDocs(
	mode: RunMode = "write",
): Promise<SourcePage[]> {
	const initialOwnership = discoverDocsInitialOwnership();
	const outputs = await discoverTypedDocs(typedDocsGenerationConfig);
	assertUniqueRouteIds(outputs);
	const result = await runCodegen(
		defineDocsCodegen(outputs, initialOwnership),
		{
			mode,
		},
	);
	// Generated docs are ignored build outputs, so a clean checkout legitimately
	// plans creates. Existing outputs must still match their typed sources.
	const hasStaleExistingOutput = result.plan.changes.some(
		(change) => change.kind === "update" || change.kind === "delete",
	);
	if (mode === "check" && hasStaleExistingOutput) {
		throw new Error(
			"Committed Dumling docs are stale. Run `bun run generate:docs`.",
		);
	}
	return outputs.map((output) => sourcePageFromDocsOutput(output));
}
