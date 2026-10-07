import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { AnnotationLayer, RuleId, SpecRecordId } from "../corpus-types.js";

const recordsDirectory = fileURLToPath(
	new URL("../../records/", import.meta.url),
);

/** A target's Lemma as the record file writes it, unchecked. */
export interface LemmaInFile {
	language: string;
	family: string;
	kind: string;
	canonicalForm: string;
	coreFeatures: Readonly<Record<string, unknown>>;
	/** The Core Features a Syncretism leaves open (system ADR 0046); absent on any other Lemma. */
	syncretic?: readonly string[];
}

/**
 * A sentence record as its file holds it, read without the loader's checks,
 * so a Draft whose layers fail still counts: its Review Depth, the Rules it
 * cites and each target's Lemma, where the target has one.
 */
export interface RecordFile {
	id: SpecRecordId;
	reviewDepth?: AnnotationLayer;
	rules: readonly RuleId[];
	lemmas: readonly LemmaInFile[];
}

const recordFileSchema = z.object({
	reviewDepth: z
		.enum(["Segmentation", "Attestation", "Reading", "Knowledge"])
		.optional(),
	sources: z
		.object({ rules: z.array(z.object({ rule: z.string() })) })
		.optional(),
	targets: z
		.array(
			z.object({
				attestation: z
					.object({
						surface: z.object({
							lemma: z.object({
								language: z.string(),
								family: z.string(),
								kind: z.string(),
								canonicalForm: z.string(),
								coreFeatures: z
									.record(z.string(), z.unknown())
									.nullish(),
								syncretic: z.array(z.string()).optional(),
							}),
						}),
					})
					.optional(),
			}),
		)
		.optional(),
});

/**
 * Reads every sentence record file of `language`, sorted by id. A file that
 * isn't JSON or lacks this loose shape is skipped: the loader reports it.
 */
export function readRecordFiles(language: string): RecordFile[] {
	const directory = join(recordsDirectory, language);
	const files: RecordFile[] = [];
	for (const name of readdirSync(directory).toSorted()) {
		if (!name.endsWith(".json")) continue;
		let input: unknown;
		try {
			input = JSON.parse(readFileSync(join(directory, name), "utf8"));
		} catch {
			continue;
		}
		const parsed = recordFileSchema.safeParse(input);
		if (!parsed.success) continue;
		const { reviewDepth, sources, targets } = parsed.data;
		files.push({
			id: `${language}/${name.slice(0, -".json".length)}`,
			...(reviewDepth === undefined ? {} : { reviewDepth }),
			rules: (sources?.rules ?? []).map((citation) => citation.rule),
			lemmas: (targets ?? []).flatMap((target) => {
				const lemma = target.attestation?.surface.lemma;
				if (!lemma) return [];
				const { syncretic, ...rest } = lemma;
				return [
					{
						...rest,
						coreFeatures: lemma.coreFeatures ?? {},
						...(syncretic === undefined ? {} : { syncretic }),
					},
				];
			}),
		});
	}
	return files;
}
