import { listMarkdownFiles } from "../shared/fs";
import { sourceTypedDocsDir } from "../shared/paths";

function assertTypedDocsTreeContainsNoMarkdown(): void {
	const markdownFiles = listMarkdownFiles(sourceTypedDocsDir);
	if (markdownFiles.length === 0) {
		return;
	}

	throw new Error(
		`Markdown files are not allowed under src/to-generate/docs: ${markdownFiles.toSorted().join(", ")}.`,
	);
}

export async function runDocsHousekeeping(): Promise<void> {
	assertTypedDocsTreeContainsNoMarkdown();
}
