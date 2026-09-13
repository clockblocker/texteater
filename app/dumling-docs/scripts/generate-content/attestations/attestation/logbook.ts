import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type * as Dumling from "dumling/types";
import { grundformLabel } from "../../../../src/lib/unit-presentation";

import {
	classificationLogbookDir,
	sourceAttestationsDir,
} from "../../shared/paths";
import type { OccurrenceAttestationSource } from "../../shared/types";
import { attestationSlugForSource } from "../entity/attestation-slug";
import { attestationSemanticSourcePath } from "./semantic-source-path";

type AttestationLogbookRow = Omit<OccurrenceAttestationSource, "sourcePath"> & {
	sourcePath?: string;
};

export type AttestationLogbookCsvOutput = {
	content: string;
	path: string;
	sourcePaths: readonly string[];
};

export function attestationLogbookCsvRow(
	attestation: AttestationLogbookRow,
): string {
	return [
		csvCell(sentenceMarkdownCsvValue(attestation.sentenceMarkdown)),
		csvCell(
			attestationSlugForSource({
				entity: attestation.entity as never,
				sentenceMarkdown: attestation.sentenceMarkdown,
			}),
		),
		csvCell(JSON.stringify(attestation.entity.members)),
		csvCell(attestation.entity.realizationCoverage),
		csvCell(attestation.classifierNotes ?? ""),
		csvCell(attestation.classificationMistakes ?? ""),
		csvCell(attestation.isVerified === true ? "true" : ""),
	].join(",");
}

export function csvCell(value: string): string {
	return /[",\n\r]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function sentenceMarkdownCsvValue(sentenceMarkdown: string): string {
	return sentenceMarkdown.replaceAll(/\s*[\r\n]+\s*/gu, " ");
}

function legacyClassificationLogbookDir(language: Dumling.Language): string {
	return join(sourceAttestationsDir, language, "classification-logbook");
}

function activeClassificationLogbookDir(language: Dumling.Language): string {
	return join(classificationLogbookDir, language);
}

function assertNoLegacyClassificationLogbookContent(): void {
	for (const language of ["de", "en", "he"] satisfies Dumling.Language[]) {
		const legacyDir = legacyClassificationLogbookDir(language);
		if (!existsSync(legacyDir) || readdirSync(legacyDir).length === 0) {
			continue;
		}
		throw new Error(
			`Legacy classification logbook content still exists at ${legacyDir}. Move it to ${activeClassificationLogbookDir(language)} before generating attestations.`,
		);
	}
}

export function prepareAttestationLogbooks(): void {
	assertNoLegacyClassificationLogbookContent();
}

export function attestationLogbookCsvOutputs(
	attestations: AttestationLogbookRow[],
): AttestationLogbookCsvOutput[] {
	const rowsByLanguage = new Map<Dumling.Language, AttestationLogbookRow[]>();
	const outputs: AttestationLogbookCsvOutput[] = [];

	for (const attestation of attestations) {
		const language = attestation.entity.surface.lemma
			.language as Dumling.Language;
		const existing = rowsByLanguage.get(language) ?? [];
		existing.push(attestation);
		rowsByLanguage.set(language, existing);
	}

	for (const language of ["de", "en", "he"] satisfies Dumling.Language[]) {
		const attestationsForLanguage = (
			rowsByLanguage.get(language) ?? []
		).toSorted((left, right) =>
			attestationSemanticSourcePath(left).localeCompare(
				attestationSemanticSourcePath(right),
				language,
			),
		);
		const logbookDir = activeClassificationLogbookDir(language);
		mkdirSync(logbookDir, { recursive: true });
		const attestationsCsvPath = join(
			logbookDir,
			`${language}-attestations.csv`,
		);
		const descriptorCsvPath = join(
			logbookDir,
			`${language}-attestation-descriptors.csv`,
		);
		const attestationLines = [
			"sentence_markdown,route_slug,members,realizationCoverage,classifierNotes,classificationMistakes,isVerified",
			...attestationsForLanguage.map((attestation) =>
				attestationLogbookCsvRow(attestation),
			),
		];
		const descriptorLines = [
			"sentence_markdown,normalizedSurface,grundform,family,kind",
			...attestationsForLanguage.map((attestation) => {
				const { family, kind } = attestation.entity.surface.lemma;

				return [
					csvCell(
						sentenceMarkdownCsvValue(attestation.sentenceMarkdown),
					),
					csvCell(attestation.entity.surface.normalizedSurface),
					csvCell(grundformLabel(attestation.entity.surface)),
					csvCell(family),
					csvCell(kind),
				].join(",");
			}),
		];
		const sourcePaths = attestationsForLanguage.flatMap((attestation) =>
			attestation.sourcePath === undefined
				? []
				: [attestation.sourcePath],
		);
		outputs.push(
			{
				content: `${attestationLines.join("\n")}\n`,
				path: attestationsCsvPath,
				sourcePaths,
			},
			{
				content: `${descriptorLines.join("\n")}\n`,
				path: descriptorCsvPath,
				sourcePaths,
			},
		);
	}

	return outputs;
}
