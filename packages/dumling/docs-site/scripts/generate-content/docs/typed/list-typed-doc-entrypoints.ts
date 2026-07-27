import { listTypeScriptFiles } from "../../shared/fs";
import { sourceTypedDocsDir } from "../../shared/paths";

export function listTypedDocEntrypoints(): string[] {
	return listTypeScriptFiles(sourceTypedDocsDir)
		.filter((path) => path.endsWith(".doc.ts"))
		.toSorted((left, right) => left.localeCompare(right));
}
