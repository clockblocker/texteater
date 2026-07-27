import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { getLanguageApi } from "../../../../../src/index.ts";
import type { SupportedLanguage } from "../../../../../src/types/public-types.ts";
import { ensureTextFile } from "../../shared/fs";
import {
	classificationLogbookDir,
	sourceAttestationsDir,
} from "../../shared/paths";
import type { LogbookFileKind } from "../../shared/types";
import { selectionSemanticSourcePath } from "./semantic-source-path";

type SelectionLogbookRow = {
	classifierNotes?: string;
	classificationMistakes?: string;
	entity: {
		language: SupportedLanguage;
		surface: {
			normalizedFullSurface: string;
		};
	};
	isVerified?: true;
	sentenceMarkdown: string;
};

export function selectionLogbookCsvRow(selection: SelectionLogbookRow): string {
	const language = selection.entity.language;
	const languageApi = getLanguageApi(language);

	return [
		csvCell(sentenceMarkdownCsvValue(selection.sentenceMarkdown)),
		csvCell(String(languageApi.id.encode.asCsv(selection.entity as never))),
		csvCell(selection.classifierNotes ?? ""),
		csvCell(selection.classificationMistakes ?? ""),
		csvCell(selection.isVerified === true ? "true" : ""),
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

export function prepareSelectionLogbooks(): void {
	assertNoLegacyClassificationLogbookContent();

	for (const language of ["de", "en", "he"] satisfies SupportedLanguage[]) {
		const logbookDir = activeClassificationLogbookDir(language);
		const legacyPath = join(
			sourceAttestationsDir,
			language,
			`${language}-selection-decisions.md`,
		);
		const reviewerNotesPath = join(logbookDir, "reviewer-notes.md");
		const summaryPath = join(logbookDir, "summary.md");

		mkdirSync(logbookDir, { recursive: true });

		if (existsSync(legacyPath)) {
			rmSync(legacyPath);
		}
		rmSync(join(logbookDir, "classifier-notes.md"), { force: true });

		ensureTextFile(reviewerNotesPath, defaultLogbookText("reviewer"));
		ensureTextFile(summaryPath, defaultLogbookText("summary"));
		validateLogbookFile(reviewerNotesPath, "reviewer");
		validateLogbookFile(summaryPath, "summary");
	}
}

export function writeSelectionLogbookCsv(
	selections: SelectionLogbookRow[],
): void {
	const rowsByLanguage = new Map<SupportedLanguage, SelectionLogbookRow[]>();

	for (const selection of selections) {
		const language = selection.entity.language as SupportedLanguage;
		const existing = rowsByLanguage.get(language) ?? [];
		existing.push(selection);
		rowsByLanguage.set(language, existing);
	}

	for (const language of ["de", "en", "he"] satisfies SupportedLanguage[]) {
		const selectionsForLanguage = (
			rowsByLanguage.get(language) ?? []
		).toSorted((left, right) =>
			selectionSemanticSourcePath(left).localeCompare(
				selectionSemanticSourcePath(right),
				language,
			),
		);
		const logbookDir = activeClassificationLogbookDir(language);
		mkdirSync(logbookDir, { recursive: true });
		const selectionsCsvPath = join(
			logbookDir,
			`${language}-attested-selections.csv`,
		);
		const descriptorCsvPath = join(
			logbookDir,
			`${language}-attested-selection-descriptors.csv`,
		);
		const selectionLines = [
			"sentence_markdown,sectionId,classifierNotes,classificationMistakes,isVerified",
			...selectionsForLanguage.map((selection) =>
				selectionLogbookCsvRow(selection),
			),
		];
		const descriptorLines = [
			"sentence_markdown,normalizedFullSurface,surfaceKind,lemmaKind,lemmaSubKind",
			...selectionsForLanguage.map((selection) => {
				const language = selection.entity.language;
				const languageApi = getLanguageApi(language);
				const descriptorFields = String(
					languageApi.describe.asCsv.selection(
						selection.entity as never,
					),
				).split(",");
				const [
					_entityKind,
					_descriptorLanguage,
					surfaceKind,
					lemmaKind,
					lemmaSubKind,
				] = descriptorFields;

				if (
					surfaceKind === undefined ||
					lemmaKind === undefined ||
					lemmaSubKind === undefined
				) {
					throw new Error(
						`Unexpected descriptor CSV shape for ${selectionSemanticSourcePath(selection)}.`,
					);
				}

				return [
					csvCell(
						sentenceMarkdownCsvValue(selection.sentenceMarkdown),
					),
					csvCell(selection.entity.surface.normalizedFullSurface),
					csvCell(surfaceKind),
					csvCell(lemmaKind),
					csvCell(lemmaSubKind),
				].join(",");
			}),
		];
		writeFileSync(selectionsCsvPath, `${selectionLines.join("\n")}\n`);
		writeFileSync(descriptorCsvPath, `${descriptorLines.join("\n")}\n`);
	}
}
