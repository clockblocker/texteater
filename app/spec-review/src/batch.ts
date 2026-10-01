import { readFile } from "node:fs/promises";
import { z } from "zod";
import type { OpenQuestion, Split } from "./shared/contract";

const rowSchema = z.strictObject({
	row: z.string().min(1),
	record: z.string().min(1),
	bucket: z.string().min(1),
	split: z.enum(["held-out", "dev"]),
	change: z.string().min(1),
	consistencySets: z.array(z.string()),
	openQuestion: z
		.strictObject({
			issue: z.number().int().positive(),
			question: z.number().int().positive(),
		})
		.optional(),
});

const batchSchema = z.strictObject({
	note: z.string().optional(),
	reserves: z.array(z.string()).optional(),
	rows: z.array(rowSchema),
});

export type BatchFile = z.infer<typeof batchSchema>;
export type BatchRow = BatchFile["rows"][number];

/** The GitHub repository whose issues hold a batch's open questions. */
const issueRepository = "clockblocker/texteater";

export function openQuestionOf(row: BatchRow): OpenQuestion | undefined {
	if (!row.openQuestion) return undefined;
	const { issue, question } = row.openQuestion;
	return {
		issue,
		question,
		url: `https://github.com/${issueRepository}/issues/${issue}`,
	};
}

/**
 * Why the batch forbids approving a row, whatever its record holds. A dev
 * row stays a Draft: the lab treats Drafts as dev and reviewed records as
 * held-out, so approving it would move it out of dev. A held-out row waits
 * for its open question to be ruled.
 */
export function blockedReason(row: {
	split: Split;
	openQuestion?: { issue: number; question: number };
}): string | undefined {
	if (row.split === "dev")
		return "Dev row: the lab treats reviewed records as held-out, so approving would move it out of dev";
	if (row.openQuestion)
		return `Open question #${row.openQuestion.issue} Q${row.openQuestion.question} is not ruled yet`;
	return undefined;
}

/** Reads and checks a batch file. Throws when it is not a batch. */
export async function readBatch(path: string): Promise<BatchFile> {
	const parsed = batchSchema.safeParse(
		JSON.parse(await readFile(path, "utf8")),
	);
	if (!parsed.success)
		throw new Error(
			`${path} is not a batch: ${z.prettifyError(parsed.error)}`,
		);
	const seen = new Set<string>();
	for (const { row } of parsed.data.rows) {
		if (seen.has(row)) throw new Error(`${path} repeats row ${row}`);
		seen.add(row);
	}
	return parsed.data;
}
