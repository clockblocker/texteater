import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ruleStatementHash, rules } from "dumcorpus";
import { formatRecordText } from "../src/record-store";

/** A current citation of one of dumcorpus's Rules. */
function currentCitation(): { rule: string; hash: string } {
	const [rule] = rules;
	if (!rule) throw new Error("dumcorpus has no Rules");
	return { rule: rule.id, hash: ruleStatementHash(rule.statement) };
}

/** A Draft whose Segmentation passes and which cites a current Rule. */
export function draftRecord(): Record<string, unknown> {
	return {
		sentence: "Er schläft.",
		segments: [
			{ kind: "ResolvableText", text: "Er" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "schläft" },
			{ kind: "Punctuation", text: "." },
		],
		coverage: "Full",
		provenance: { kind: "Authored" },
		sources: {
			adrs: [],
			rules: [currentCitation()],
			references: [],
		},
		targets: [
			{
				memberSegmentIndices: [0],
				route: { family: "Lexeme", kind: "PRON" },
			},
			{
				memberSegmentIndices: [2],
				route: { family: "Lexeme", kind: "VERB" },
				notes: { rationale: "A plain verb." },
			},
		],
		noTarget: [],
	};
}

/**
 * A Draft whose nonce noun has No Target together with its article:
 * `[Der, Blarg]` is one entry.
 */
export function nonceNounRecord(): Record<string, unknown> {
	return {
		...draftRecord(),
		sentence: "Der Blarg schläft.",
		segments: [
			{ kind: "ResolvableText", text: "Der" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Blarg" },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "schläft" },
			{ kind: "Punctuation", text: "." },
		],
		targets: [
			{
				memberSegmentIndices: [4],
				route: { family: "Lexeme", kind: "VERB" },
			},
		],
		noTarget: [
			{
				memberSegmentIndices: [0, 2],
				reason: "A nonce noun with its article.",
			},
		],
	};
}

/** The record's text as biome formats a record file. */
export function formatted(record: unknown): Promise<string> {
	return formatRecordText(JSON.stringify(record), "de/fixture");
}

/**
 * Writes records under `<root>/records` and returns the root, where a batch
 * file can sit beside them.
 */
export async function recordsRoot(
	records: Record<string, unknown>,
): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "spec-review-"));
	for (const [id, record] of Object.entries(records)) {
		const path = join(root, "records", `${id}.json`);
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, await formatted(record));
	}
	return root;
}

/** One batch row, held-out and unblocked unless overridden. */
export function batchRow(
	row: string,
	record: string,
	overrides: Record<string, unknown> = {},
) {
	return {
		row,
		record,
		bucket: "locution",
		split: "held-out",
		change: "new",
		consistencySets: [],
		...overrides,
	};
}
