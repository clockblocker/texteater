import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const scriptDir = dirname(fileURLToPath(import.meta.url));
export const siteRoot = resolve(scriptDir, "../../..");
export const repoRoot = resolve(siteRoot, "..");
export const sourceTypedDocsDir = join(siteRoot, "src/to-generate/docs");
export const generatedDocsDir = join(siteRoot, "src/generated/docs");
export const generatedEntitiesDir = join(siteRoot, "src/generated/entities");
export const publicDir = join(siteRoot, "public");
export const readmeExamplesDir = join(repoRoot, "generate-readme/examples");

const specRecordsDir = join(siteRoot, "../../battery/dumspec/records");

/** The file of a dumspec Spec Record, whose id is its path. */
export function specRecordPath(id: string): string {
	return join(specRecordsDir, `${id}.json`);
}

export function pathRelativeToSiteRoot(path: string): string {
	return relative(siteRoot, path).replaceAll("\\", "/");
}
