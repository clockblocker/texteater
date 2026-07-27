import { existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import type { SupportedLanguage } from "../../../../../src/types/public-types.ts";
import { listTypeScriptFiles, removeEmptyDirectories } from "../../shared/fs";
import { sourceAttestationsDir } from "../../shared/paths";
import { loadAttestationSource } from "../source/load-attestation-source";
import { expectedEntityKindForPath } from "../validate/expected-entity-kind-for-path";
import { validateSelectionAttestation } from "../validate/validate-selection-attestation";
import { selectionSemanticSourcePath } from "./semantic-source-path";

export async function renameSelectionSources(): Promise<string[]> {
	const selectionFiles = listTypeScriptFiles(sourceAttestationsDir).filter(
		(sourcePath) => expectedEntityKindForPath(sourcePath) === "Selection",
	);
	const renamePlan = new Map<string, string>();
	const claimedTargets = new Map<string, string>();

	for (const sourcePath of selectionFiles) {
		const source = await loadAttestationSource(sourcePath);
		validateSelectionAttestation(source);
		const targetPath = selectionSemanticSourcePath(source);
		const priorSource = claimedTargets.get(targetPath);
		if (priorSource !== undefined && priorSource !== sourcePath) {
			throw new Error(
				`Selection filename collision: ${priorSource} and ${sourcePath} both normalize to ${targetPath}.`,
			);
		}
		claimedTargets.set(targetPath, sourcePath);
		if (targetPath !== sourcePath) {
			renamePlan.set(sourcePath, targetPath);
		}
	}

	for (const [sourcePath, targetPath] of renamePlan) {
		if (existsSync(targetPath) && !renamePlan.has(targetPath)) {
			throw new Error(
				`Cannot rename ${sourcePath} to ${targetPath}: target already exists.`,
			);
		}
	}

	for (const [sourcePath, targetPath] of renamePlan) {
		mkdirSync(dirname(targetPath), { recursive: true });
		renameSync(sourcePath, targetPath);
	}

	for (const language of ["de", "en", "he"] satisfies SupportedLanguage[]) {
		removeEmptyDirectories(
			`${sourceAttestationsDir}/${language}/selection`,
		);
	}

	return listTypeScriptFiles(sourceAttestationsDir).filter(
		(sourcePath) => expectedEntityKindForPath(sourcePath) !== undefined,
	);
}
