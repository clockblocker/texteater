import { relative } from "node:path";
import { listMarkdownFiles } from "../shared/fs";
import { generatedDocsDir, publicDir } from "../shared/paths";
import {
	generatedRouteIdForPath,
	publicMarkdownPathForRouteId,
} from "./routes";

export type DocsInitialOwnership = Readonly<{
	generatedDocs: readonly string[];
	publicDocs: readonly string[];
}>;

function artifactPath(root: string, path: string): string {
	return relative(root, path).replaceAll("\\", "/");
}

export function docsInitialOwnershipForGeneratedPaths(
	generatedPaths: readonly string[],
): DocsInitialOwnership {
	const generatedDocs = generatedPaths
		.map((path) => artifactPath(generatedDocsDir, path))
		.toSorted();
	const publicDocs = [
		...generatedPaths.map((path) =>
			artifactPath(
				publicDir,
				publicMarkdownPathForRouteId(generatedRouteIdForPath(path)),
			),
		),
		"nav.json",
		"nav.md",
	].toSorted();

	return Object.freeze({
		generatedDocs: Object.freeze(generatedDocs),
		publicDocs: Object.freeze(publicDocs),
	});
}

export function discoverDocsInitialOwnership(): DocsInitialOwnership {
	return docsInitialOwnershipForGeneratedPaths(
		listMarkdownFiles(generatedDocsDir),
	);
}
