import { type RunMode, runCodegen } from "codegen";
import { listMarkdownFiles } from "../shared/fs";
import { sourceTypedDocsDir } from "../shared/paths";
import { definePagesCodegen } from "./codegen";
import { discoverTypedDocs } from "./typed/generate-typed-docs";

function assertTypedDocsTreeContainsNoMarkdown(): void {
	const markdownFiles = listMarkdownFiles(sourceTypedDocsDir);
	if (markdownFiles.length === 0) {
		return;
	}

	throw new Error(
		`Markdown files are not allowed under src/to-generate/docs: ${markdownFiles.toSorted().join(", ")}.`,
	);
}

export async function generateDocs(mode: RunMode = "write"): Promise<void> {
	assertTypedDocsTreeContainsNoMarkdown();
	// Generated docs are ignored build outputs, so check mode plans them without
	// comparing against whatever an earlier run left in this working tree.
	await runCodegen(definePagesCodegen("docs", await discoverTypedDocs()), {
		mode,
	});
}
