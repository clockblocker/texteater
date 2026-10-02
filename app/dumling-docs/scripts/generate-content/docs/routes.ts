import { relative } from "node:path";
import { sourceTypedDocsDir } from "../shared/paths";

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

export function routeIdForGeneratedDocSourcePath(sourcePath: string): string {
	const relativePath = normalizePathSegments(
		relative(sourceTypedDocsDir, sourcePath).replace(/\.doc\.ts$/u, ""),
	);
	return normalizeRouteId(relativePath);
}
