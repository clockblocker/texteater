import { mkdirSync } from "node:fs";
import { generatedDocsDir, publicDir } from "../shared/paths";
import type { SourcePage } from "../shared/types";
import { typedDocsGenerationConfig } from "./typed/config";
import { discoverTypedDocs, writeTypedDocs } from "./typed/generate-typed-docs";
import type { DocsOutput } from "./types";
import { removeGeneratedDocOutputs, writeNavFiles } from "./write-nav";

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
	mkdirSync(generatedDocsDir, { recursive: true });
	mkdirSync(publicDir, { recursive: true });
	removeGeneratedDocOutputs();
	const outputs = await discoverTypedDocs(typedDocsGenerationConfig);
	assertUniqueRouteIds(outputs);
	const pages = [...writeTypedDocs(outputs)];
	writeNavFiles();
	return pages;
}
