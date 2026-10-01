import { createHash } from "node:crypto";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	checkRecord,
	type RecordCheck,
	ruleStatementHash,
	rules,
} from "dumspec";
import type * as Dumspec from "dumspec/types";
import { applyEdits, type FormattingOptions, modify } from "jsonc-parser";
import type { CitationStatus, RuleCitationView } from "./shared/contract";

/** A sentence record's id, as dumspec's `checkRecord` accepts it. */
const recordIdPattern = /^(de|en|he)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+$/u;

/** One record file as it is on disk now. */
export interface StoredRecord {
	id: Dumspec.SpecRecordId;
	/** The file's bytes' sha256; absent when there is no file. */
	sha256?: string;
	text?: string;
	json?: unknown;
	check?: RecordCheck;
	/** Why the file cannot be read as a Spec Record. */
	problem?: string;
}

/** A readable record: its file parses and has a Spec Record's shape. */
export type ReadableRecord = Required<Omit<StoredRecord, "problem">>;

export function isReadable(record: StoredRecord): record is ReadableRecord {
	return record.problem === undefined;
}

export type SaveResult =
	| { outcome: "saved"; record: StoredRecord }
	| { outcome: "conflict"; record: StoredRecord }
	| { outcome: "refused"; reason: string };

const sha256 = (text: string) =>
	createHash("sha256").update(text).digest("hex");

const rulesById = new Map(rules.map((rule) => [rule.id, rule]));

/** Whether each Rule a record cites is current, reworded, or unknown. */
export function citationStatuses(
	citations: readonly Dumspec.RuleCitation[],
): RuleCitationView[] {
	return citations.map(({ rule, hash }) => {
		const cited = rulesById.get(rule);
		const status: CitationStatus =
			cited === undefined
				? "unknown"
				: ruleStatementHash(cited.statement) === hash
					? "current"
					: "stale";
		return { rule, hash, status };
	});
}

function withDepth(
	json: unknown,
	depth: Dumspec.AnnotationLayer | undefined,
): Record<string, unknown> {
	const { reviewDepth: _, ...rest } = json as Record<string, unknown>;
	return depth === undefined ? rest : { ...rest, reviewDepth: depth };
}

/**
 * Why setting a readable record's Review Depth to `depth` would leave it
 * failing dumspec, or undefined when it would pass: a reviewed record must
 * pass every layer through its depth and every whole-record check, and
 * must cite only current Rules.
 */
export function depthChangeProblem(
	record: ReadableRecord,
	depth: Dumspec.AnnotationLayer | undefined,
): string | undefined {
	const { errors } = checkRecord(record.id, withDepth(record.json, depth));
	const [first] = errors;
	if (first)
		return `${depth ?? "Draft"} would fail ${first.path || "the record"}: ${first.message}${errors.length > 1 ? ` (and ${errors.length - 1} more)` : ""}`;
	if (depth === undefined) return undefined;
	const sources = (record.json as { sources: Dumspec.Sources }).sources;
	const notCurrent = citationStatuses(sources.rules).filter(
		(citation) => citation.status !== "current",
	);
	if (notCurrent.length > 0)
		return `Cites ${notCurrent.map(({ rule, status }) => `${status} Rule ${rule}`).join(", ")}; re-check it against the Rule and cite the current hash first`;
	return undefined;
}

const formatting: FormattingOptions = {
	insertSpaces: false,
	tabSize: 4,
	eol: "\n",
};

/** The record's text with only its `reviewDepth` changed. */
function editDepth(
	text: string,
	depth: Dumspec.AnnotationLayer | undefined,
): string {
	return applyEdits(
		text,
		modify(text, ["reviewDepth"], depth, {
			formattingOptions: formatting,
			// Where every reviewed record keeps it: right after `coverage`.
			getInsertionIndex: (properties) => {
				const coverage = properties.indexOf("coverage");
				return coverage === -1 ? properties.length : coverage + 1;
			},
		}),
	);
}

/** dumspec's package directory, whose biome configuration formats records. */
export const dumspecDirectory = dirname(
	fileURLToPath(import.meta.resolve("dumspec/package.json")),
);

const biomePath = fileURLToPath(
	import.meta.resolve("@biomejs/biome/bin/biome"),
);

/**
 * Formats a record file's text as biome formats dumspec's record `id`, with
 * dumspec's configuration, wherever the records directory lies.
 */
export async function formatRecordText(
	text: string,
	id: Dumspec.SpecRecordId,
): Promise<string> {
	const child = Bun.spawn(
		[
			process.execPath,
			biomePath,
			"format",
			`--stdin-file-path=records/${id}.json`,
		],
		{
			cwd: dumspecDirectory,
			stdin: new Blob([text]),
			stdout: "pipe",
			stderr: "pipe",
		},
	);
	const [output, error, exit] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	if (exit !== 0 || output.trim() === "")
		throw new Error(`biome could not format ${id}: ${error.trim()}`);
	return output;
}

/**
 * Reads and edits the Spec Record files under one directory. Each read
 * checks one file with dumspec's `checkRecord`, so a broken file never hides
 * another. A save changes only `reviewDepth`, keeps the file's layout, and
 * writes only when the file still has the hash the edit was based on.
 */
export function createRecordStore(recordsDirectory: string) {
	const pathOf = (id: string) => join(recordsDirectory, `${id}.json`);
	let saving: Promise<unknown> = Promise.resolve();

	async function read(id: Dumspec.SpecRecordId): Promise<StoredRecord> {
		if (!recordIdPattern.test(id))
			return { id, problem: `${id} is not a sentence record id` };
		let text: string;
		try {
			text = await readFile(pathOf(id), "utf8");
		} catch {
			return { id, problem: `No file ${id}.json` };
		}
		const hash = sha256(text);
		let json: unknown;
		try {
			json = JSON.parse(text);
		} catch (error) {
			return {
				id,
				sha256: hash,
				text,
				problem: `Invalid JSON: ${(error as Error).message}`,
			};
		}
		const check = checkRecord(id, json);
		if (check.errors.some((issue) => issue.check === "Shape"))
			return {
				id,
				sha256: hash,
				text,
				json,
				check,
				problem: "The file does not have a Spec Record's shape",
			};
		return { id, sha256: hash, text, json, check };
	}

	async function save(
		id: Dumspec.SpecRecordId,
		expectedSha256: string,
		depth: Dumspec.AnnotationLayer | undefined,
	): Promise<SaveResult> {
		const current = await read(id);
		if (current.sha256 !== expectedSha256)
			return { outcome: "conflict", record: current };
		if (!isReadable(current))
			return { outcome: "refused", reason: current.problem ?? "" };
		const problem = depthChangeProblem(current, depth);
		if (problem) return { outcome: "refused", reason: problem };

		const path = pathOf(id);
		const next = await formatRecordText(editDepth(current.text, depth), id);
		if (!Bun.deepEquals(JSON.parse(next), withDepth(current.json, depth)))
			return {
				outcome: "refused",
				reason: "The edit would change more than reviewDepth",
			};
		const temporary = `${path}.tmp`;
		await writeFile(temporary, next);
		try {
			// Another session may have written since this save read the file.
			const latest = await read(id);
			if (latest.sha256 !== expectedSha256)
				return { outcome: "conflict", record: latest };
			await rename(temporary, path);
		} finally {
			await unlink(temporary).catch(() => undefined);
		}
		return { outcome: "saved", record: await read(id) };
	}

	return {
		read,
		/**
		 * Sets the record's Review Depth, or makes it a Draft for
		 * `undefined`. Writes nothing and answers `conflict` with the record
		 * as it is now when the file's hash is not `expectedSha256`, and
		 * `refused` when the result would fail dumspec's checks.
		 */
		setReviewDepth(
			id: Dumspec.SpecRecordId,
			expectedSha256: string,
			depth: Dumspec.AnnotationLayer | undefined,
		): Promise<SaveResult> {
			const result = saving.then(() => save(id, expectedSha256, depth));
			saving = result.catch(() => undefined);
			return result;
		},
	};
}
