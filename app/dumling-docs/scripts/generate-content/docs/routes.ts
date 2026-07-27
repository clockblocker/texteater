import { join, relative } from "node:path";
import { generatedDocsDir, publicDir, sourceTypedDocsDir } from "../shared/paths";

function normalizePathSegments(path: string): string {
	return path.replaceAll("\\", "/");
}

export function normalizeRouteId(routeId: string): string {
	const normalized = normalizePathSegments(routeId)
		.replace(/^\/+/u, "")
		.replace(/\/+$/u, "");
	if (normalized === "" || normalized === "index") {
		return "index";
	}
	return normalized.endsWith("/index")
		? normalized.slice(0, -"/index".length)
		: normalized;
}

export function publicHrefForRouteId(routeId: string): string {
	return routeId === "index" ? "/" : `/${routeId}/`;
}

export function routeIdForGeneratedDocSourcePath(sourcePath: string): string {
	const relativePath = normalizePathSegments(
		relative(sourceTypedDocsDir, sourcePath).replace(/\.doc\.ts$/u, ""),
	);
	return normalizeRouteId(relativePath);
}

export function generatedRouteIdForPath(sourcePath: string): string {
	return normalizeRouteId(
		relative(generatedDocsDir, sourcePath).replace(/\.md$/u, ""),
	);
}

export function generatedPathForTypedDoc(routeId: string): string {
	return routeId === "index"
		? join(generatedDocsDir, "index.md")
		: join(generatedDocsDir, `${routeId}.md`);
}

export function publicMarkdownPathForRouteId(routeId: string): string {
	return routeId === "index"
		? join(publicDir, "index.md")
		: join(publicDir, `${routeId}.md`);
}
