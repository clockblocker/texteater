import type { DocPageMeta } from "../../../src/lib/docs/document-shapes.ts";

function trimmedOrUndefined(value: string | undefined): string | undefined {
	const trimmed = value?.trim();
	return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

/** Trims a page's meta and rejects an empty title, which tsc can't. */
export function normalizeDocPageMeta(
	meta: DocPageMeta,
	sourcePath: string,
): DocPageMeta {
	const title = meta.title.trim();
	if (title.length === 0) {
		throw new Error(`${sourcePath} is missing meta.title.`);
	}

	return {
		description: trimmedOrUndefined(meta.description),
		navTitle: trimmedOrUndefined(meta.navTitle),
		order: meta.order,
		title,
	};
}
