import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
} from "node:fs";
import { join } from "node:path";
import { getLanguageApi } from "dumling";
import type { SupportedLanguage } from "dumling/types";
import { ensureTextFile } from "../../shared/fs";
import {
	classificationLogbookDir,
	sourceAttestationsDir,
} from "../../shared/paths";
import type {
	LogbookFileKind,
	OccurrenceAttestationSource,
} from "../../shared/types";
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

export function defaultLogbookText(kind: LogbookFileKind): string {
	if (kind === "classifier") {
		return "### Classifier Notes\n\n-\n\n### Open Questions\n\n-\n";
	}
	if (kind === "reviewer") {
		return "### Reviewer Notes\n\n-\n\n### Open Questions\n\n-\n";
	}
	return "### Common Mistakes\n\n-\n\n### Locked-In Rules\n\n-\n";
}

export function requiredLogbookSections(kind: LogbookFileKind): string[] {
	if (kind === "classifier") {
		return ["Classifier Notes", "Open Questions"];
	}
	if (kind === "reviewer") {
		return ["Reviewer Notes", "Open Questions"];
	}
	return ["Common Mistakes", "Locked-In Rules"];
}

export function validateLogbookFile(path: string, kind: LogbookFileKind): void {
	const text = readFileSync(path, "utf8");
	const expectedSections = requiredLogbookSections(kind);
	const sectionMatches: RegExpExecArray[] = [];

	for (const section of expectedSections) {
		const escapedSection = section.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
		const matcher = new RegExp(`^#{1,6} ${escapedSection}$`, "gmu");
		const previousMatchIndex =
			sectionMatches[sectionMatches.length - 1]?.index ?? -1;
		matcher.lastIndex = previousMatchIndex + 1;
		const match = matcher.exec(text);

		if (match?.index === undefined) {
			throw new Error(
				`${path} must contain these sections in order: ${expectedSections.map((expectedSection) => `"${expectedSection}"`).join(", ")}.`,
			);
		}

		sectionMatches.push(match);
	}

	for (let index = 0; index < sectionMatches.length; index += 1) {
		const start = sectionMatches[index]?.index;
		if (start === undefined) continue;
		const headingLine = sectionMatches[index]?.[0] ?? "";
		const bodyStart = start + headingLine.length;
		const bodyEnd =
			index + 1 < sectionMatches.length
				? (sectionMatches[index + 1]?.index ?? text.length)
				: text.length;
		const body = text.slice(bodyStart, bodyEnd).trim();

		if (body.length === 0) {
			throw new Error(
				`${path} section "${expectedSections[index]}" must not be empty; empty sections must contain exactly "-".`,
			);
		}
		if (body === "-") {
			continue;
		}
		if (!/\S/u.test(body)) {
			throw new Error(
				`${path} section "${expectedSections[index]}" must contain text or exactly "-".`,
			);
		}
	}
}

function legacyClassificationLogbookDir(language: SupportedLanguage): string {
	return join(sourceAttestationsDir, language, "classification-logbook");
}

function activeClassificationLogbookDir(language: SupportedLanguage): string {
	return join(classificationLogbookDir, language);
}

function assertNoLegacyClassificationLogbookContent(): void {
	for (const language of ["de", "en", "he"] satisfies SupportedLanguage[]) {
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

	for (const language of ["de", "en", "he"] satisfies SupportedLanguage[]) {
		const logbookDir = activeClassificationLogbookDir(language);
		const reviewerNotesPath = join(logbookDir, "reviewer-notes.md");
		const summaryPath = join(logbookDir, "summary.md");

		mkdirSync(logbookDir, { recursive: true });

		rmSync(join(logbookDir, "classifier-notes.md"), { force: true });

		ensureTextFile(reviewerNotesPath, defaultLogbookText("reviewer"));
		ensureTextFile(summaryPath, defaultLogbookText("summary"));
		validateLogbookFile(reviewerNotesPath, "reviewer");
		validateLogbookFile(summaryPath, "summary");
	}
}

export function attestationLogbookCsvOutputs(
	attestations: AttestationLogbookRow[],
): AttestationLogbookCsvOutput[] {
	const rowsByLanguage = new Map<
		SupportedLanguage,
		AttestationLogbookRow[]
	>();
	const outputs: AttestationLogbookCsvOutput[] = [];

	for (const attestation of attestations) {
		const language = attestation.entity.surface.lemma
			.language as SupportedLanguage;
		const existing = rowsByLanguage.get(language) ?? [];
		existing.push(attestation);
		rowsByLanguage.set(language, existing);
	}

	for (const language of ["de", "en", "he"] satisfies SupportedLanguage[]) {
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
			"sentence_markdown,normalizedSurface,surfaceKind,family,kind",
			...attestationsForLanguage.map((attestation) => {
				const language = attestation.entity.surface.lemma.language;
				const languageApi = getLanguageApi(language);
				const descriptorFields = String(
					languageApi.describe.asCsv.attestation(
						attestation.entity as never,
					),
				).split(",");
				const [
					_entityKind,
					_descriptorLanguage,
					surfaceKind,
					family,
					kind,
				] = descriptorFields;

				if (
					surfaceKind === undefined ||
					family === undefined ||
					kind === undefined
				) {
					throw new Error(
						`Unexpected descriptor CSV shape for ${attestationSemanticSourcePath(attestation)}.`,
					);
				}

				return [
					csvCell(
						sentenceMarkdownCsvValue(attestation.sentenceMarkdown),
					),
					csvCell(attestation.entity.surface.normalizedSurface),
					csvCell(surfaceKind),
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
