import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { parseFrontmatter } from "../docs/frontmatter";
import { publicMarkdownPathForRouteId } from "../docs/routes";
import { listMarkdownFiles } from "../shared/fs";
import {
	generatedDocsDir,
	generatedEntitiesDir,
	publicDir,
} from "../shared/paths";

export type AttestationsInitialOwnership = Readonly<{
	generatedEntities: readonly string[];
	legacyGeneratedDocs: readonly string[];
	publicAttestations: readonly string[];
}>;

export type ExistingGeneratedPage = Readonly<{
	location: "docs" | "entities";
	path: string;
	routeId: string;
}>;

function artifactPath(root: string, path: string): string {
	return relative(root, path).replaceAll("\\", "/");
}

export function attestationsInitialOwnershipForPages(
	pages: readonly ExistingGeneratedPage[],
): AttestationsInitialOwnership {
	const generatedEntities = new Set<string>();
	const legacyGeneratedDocs = new Set<string>();
	const publicAttestations = new Set<string>();

	for (const page of pages) {
		const isLegacyAttestation = page.routeId.includes("/attestation/");
		const isEntityAttestation =
			page.location === "entities" &&
			page.routeId.split("/").length === 3;
		if (!isLegacyAttestation && !isEntityAttestation) {
			continue;
		}

		if (page.location === "entities") {
			generatedEntities.add(
				artifactPath(generatedEntitiesDir, page.path),
			);
		} else {
			legacyGeneratedDocs.add(artifactPath(generatedDocsDir, page.path));
		}
		publicAttestations.add(
			artifactPath(publicDir, publicMarkdownPathForRouteId(page.routeId)),
		);
	}

	return Object.freeze({
		generatedEntities: Object.freeze([...generatedEntities].toSorted()),
		legacyGeneratedDocs: Object.freeze([...legacyGeneratedDocs].toSorted()),
		publicAttestations: Object.freeze([...publicAttestations].toSorted()),
	});
}

export function discoverAttestationsInitialOwnership(): AttestationsInitialOwnership {
	const pages: ExistingGeneratedPage[] = [];
	for (const [location, root] of [
		["docs", generatedDocsDir],
		["entities", generatedEntitiesDir],
	] as const) {
		for (const path of listMarkdownFiles(root)) {
			if (!existsSync(path)) {
				continue;
			}
			let routeId: string | undefined;
			try {
				routeId = parseFrontmatter(readFileSync(path, "utf8"), path)
					.frontmatter.routeId;
			} catch (error) {
				if (
					error instanceof Error &&
					"code" in error &&
					error.code === "ENOENT"
				) {
					continue;
				}
				throw error;
			}
			if (routeId !== undefined) {
				pages.push({ location, path, routeId });
			}
		}
	}
	return attestationsInitialOwnershipForPages(pages);
}
