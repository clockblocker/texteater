import { existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import type { EntityValue, SupportedLanguage } from "dumling/types";
import { listTypeScriptFiles, removeEmptyDirectories } from "../../shared/fs";
import { sourceAttestationsDir } from "../../shared/paths";
import { attestationSemanticSourcePath } from "../attestation/semantic-source-path";
import { attestationSlugForEntity } from "../entity/attestation-slug";
import { expectedEntityKindForPath } from "../validate/expected-entity-kind-for-path";
import { validateOccurrenceAttestation } from "../validate/validate-occurrence-attestation";
import { loadAttestationSource } from "./load-attestation-source";

function applyRenamePlan(renamePlan: Map<string, string>) {
	const claimedTargets = new Map<string, string>();
	for (const [sourcePath, targetPath] of renamePlan) {
		const priorSource = claimedTargets.get(targetPath);
		if (priorSource !== undefined && priorSource !== sourcePath) {
			throw new Error(
				`Attestation filename collision: ${priorSource} and ${sourcePath} both normalize to ${targetPath}.`,
			);
		}
		claimedTargets.set(targetPath, sourcePath);
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
}

function identityAddressedSourcePath(sourcePath: string, entity: EntityValue) {
	return join(dirname(sourcePath), `${attestationSlugForEntity(entity)}.ts`);
}

export async function renameAttestationSources(): Promise<string[]> {
	const attestationFiles = listTypeScriptFiles(sourceAttestationsDir).filter(
		(sourcePath) => expectedEntityKindForPath(sourcePath) === "Attestation",
	);
	const renamePlan = new Map<string, string>();
	const claimedTargets = new Map<string, string>();

	for (const sourcePath of attestationFiles) {
		const source = await loadAttestationSource(sourcePath);
		validateOccurrenceAttestation(source);
		const targetPath = attestationSemanticSourcePath(source);
		const priorSource = claimedTargets.get(targetPath);
		if (priorSource !== undefined && priorSource !== sourcePath) {
			throw new Error(
				`Attestation filename collision: ${priorSource} and ${sourcePath} both normalize to ${targetPath}.`,
			);
		}
		claimedTargets.set(targetPath, sourcePath);
		if (targetPath !== sourcePath) {
			renamePlan.set(sourcePath, targetPath);
		}
	}

	applyRenamePlan(renamePlan);

	for (const language of ["de", "en", "he"] satisfies SupportedLanguage[]) {
		removeEmptyDirectories(
			`${sourceAttestationsDir}/${language}/attestation`,
		);
	}

	const sourcePaths = listTypeScriptFiles(sourceAttestationsDir).filter(
		(sourcePath) => expectedEntityKindForPath(sourcePath) !== undefined,
	);
	const identityRenamePlan = new Map<string, string>();
	for (const sourcePath of sourcePaths) {
		if (expectedEntityKindForPath(sourcePath) === "Attestation") continue;
		const source = await loadAttestationSource(sourcePath);
		const targetPath = identityAddressedSourcePath(
			sourcePath,
			source.entity,
		);
		if (targetPath !== sourcePath) {
			identityRenamePlan.set(sourcePath, targetPath);
		}
	}
	applyRenamePlan(identityRenamePlan);

	return listTypeScriptFiles(sourceAttestationsDir).filter(
		(sourcePath) => expectedEntityKindForPath(sourcePath) !== undefined,
	);
}
