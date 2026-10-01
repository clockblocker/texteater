import type { SpecIssue } from "dumspec";
import type * as Dumspec from "dumspec/types";
import {
	type BatchRow,
	blockedReason,
	openQuestionOf,
	readBatch,
} from "./batch";
import { changedRecordIds } from "./git-status";
import {
	citationStatuses,
	createRecordStore,
	depthChangeProblem,
	isReadable,
	type ReadableRecord,
	type StoredRecord,
} from "./record-store";
import type {
	ActionView,
	BatchRowView,
	BatchView,
	IssueView,
	RecordView,
	SaveRequest,
	SaveResponse,
	UnitView,
} from "./shared/contract";

/** The fields of a record file the page shows, once its shape has passed. */
interface RecordFile {
	sentence: string;
	segments: Dumspec.Segment[];
	coverage: Dumspec.Coverage;
	sources: Dumspec.Sources;
	noTarget: Dumspec.NoTarget[];
	targets: {
		memberSegmentIndices: number[];
		route: { family: string; kind: string };
		notes?: { rationale?: string };
		attestation?: unknown;
	}[];
}

function lemmaHint(attestation: unknown): string | undefined {
	const canonicalForm = (
		attestation as
			| { surface?: { lemma?: { canonicalForm?: unknown } } }
			| undefined
	)?.surface?.lemma?.canonicalForm;
	return typeof canonicalForm === "string" ? canonicalForm : undefined;
}

const issueView = ({ record: _, ...issue }: SpecIssue): IssueView => issue;

function approveAction(row: BatchRow, record: ReadableRecord): ActionView {
	const blocked = blockedReason(row);
	if (blocked) return { allowed: false, reason: blocked };
	const { reviewDepth } = record.check;
	if (reviewDepth !== undefined)
		return {
			allowed: false,
			reason: `Already reviewed through ${reviewDepth}`,
		};
	const problem = depthChangeProblem(record, "Segmentation");
	return problem ? { allowed: false, reason: problem } : { allowed: true };
}

function takeBackAction(record: ReadableRecord): ActionView {
	const { reviewDepth } = record.check;
	if (reviewDepth === undefined)
		return { allowed: false, reason: "The record is a Draft" };
	if (reviewDepth !== "Segmentation")
		return {
			allowed: false,
			reason: `Reviewed through ${reviewDepth}; only a Segmentation approval can be taken back here`,
		};
	const problem = depthChangeProblem(record, undefined);
	return problem ? { allowed: false, reason: problem } : { allowed: true };
}

/**
 * The review of one batch: its rows with their records' state, each record's
 * Segmentation, and approving a row to Segmentation depth or taking that
 * back. Reads the batch file on every call, so a ruled question unblocks
 * its rows without a restart.
 */
export function createReview(options: {
	batchPath: string;
	recordsDirectory: string;
}) {
	const store = createRecordStore(options.recordsDirectory);

	function rowView(
		row: BatchRow,
		record: StoredRecord,
		changed: ReadonlySet<string> | null,
	): BatchRowView {
		const openQuestion = openQuestionOf(row);
		const blocked = blockedReason(row);
		const sentence = (record.json as { sentence?: unknown } | undefined)
			?.sentence;
		return {
			row: row.row,
			record: row.record,
			bucket: row.bucket,
			split: row.split,
			change: row.change,
			consistencySets: row.consistencySets,
			...(openQuestion ? { openQuestion } : {}),
			...(typeof sentence === "string" ? { sentence } : {}),
			...(record.check?.reviewDepth
				? { reviewDepth: record.check.reviewDepth }
				: {}),
			...(record.check?.validThrough
				? { validThrough: record.check.validThrough }
				: {}),
			dirty: changed === null ? null : changed.has(row.record),
			...(blocked ? { blocked } : {}),
			...(record.problem ? { problem: record.problem } : {}),
		};
	}

	function recordView(
		row: BatchRow,
		record: StoredRecord,
		changed: ReadonlySet<string> | null,
	): RecordView {
		const head = {
			id: record.id,
			row: rowView(row, record, changed),
			dirty: changed === null ? null : changed.has(record.id),
		};
		if (!isReadable(record))
			return {
				...head,
				status: "unreadable",
				...(record.sha256 ? { sha256: record.sha256 } : {}),
				problem: record.problem ?? "",
				recordIssues: (record.check?.errors ?? []).map(issueView),
			};
		const file = record.json as RecordFile;
		const issues = [...record.check.errors, ...record.check.issues];
		const units: UnitView[] = file.targets.map((target) => {
			const hint = lemmaHint(target.attestation);
			return {
				memberSegmentIndices: target.memberSegmentIndices,
				route: target.route,
				...(target.notes?.rationale
					? { rationale: target.notes.rationale }
					: {}),
				...(hint ? { lemmaHint: hint } : {}),
			};
		});
		const { reviewDepth, validThrough } = record.check;
		return {
			...head,
			status: "readable",
			sha256: record.sha256,
			sentence: file.sentence,
			segments: file.segments,
			coverage: file.coverage,
			...(reviewDepth ? { reviewDepth } : {}),
			...(validThrough ? { validThrough } : {}),
			units,
			noTarget: file.noTarget,
			recordIssues: issues
				.filter((issue) => issue.layer === undefined)
				.map(issueView),
			segmentationIssues: issues
				.filter((issue) => issue.layer === "Segmentation")
				.map(issueView),
			deeperIssues: issues
				.filter(
					(issue) =>
						issue.layer !== undefined &&
						issue.layer !== "Segmentation",
				)
				.map(issueView),
			rules: citationStatuses(file.sources.rules),
			approve: approveAction(row, record),
			takeBack: takeBackAction(record),
		};
	}

	async function findRow(id: string): Promise<BatchRow | undefined> {
		const batch = await readBatch(options.batchPath);
		return batch.rows.find((row) => row.record === id);
	}

	async function view(row: BatchRow): Promise<RecordView> {
		const [record, changed] = await Promise.all([
			store.read(row.record),
			changedRecordIds(options.recordsDirectory),
		]);
		return recordView(row, record, changed);
	}

	async function save(
		request: SaveRequest,
		action: "approve" | "takeBack",
	): Promise<{ status: number; body: SaveResponse }> {
		const row = await findRow(request.id);
		if (!row)
			return {
				status: 404,
				body: {
					outcome: "refused",
					error: `${request.id} is not in the batch`,
				},
			};
		const current = await store.read(row.record);
		if (current.sha256 !== request.sha256)
			return {
				status: 409,
				body: {
					outcome: "conflict",
					error: "The file changed since it was loaded",
					record: await view(row),
				},
			};
		if (isReadable(current)) {
			const verdict =
				action === "approve"
					? approveAction(row, current)
					: takeBackAction(current);
			if (!verdict.allowed)
				return {
					status: 422,
					body: { outcome: "refused", error: verdict.reason ?? "" },
				};
		}
		const result = await store.setReviewDepth(
			row.record,
			request.sha256,
			action === "approve" ? "Segmentation" : undefined,
		);
		if (result.outcome === "refused")
			return {
				status: 422,
				body: { outcome: "refused", error: result.reason },
			};
		const body = { record: await view(row) };
		return result.outcome === "conflict"
			? {
					status: 409,
					body: {
						outcome: "conflict",
						error: "The file changed since it was loaded",
						...body,
					},
				}
			: { status: 200, body: { outcome: "saved", ...body } };
	}

	return {
		async batch(): Promise<BatchView> {
			const batch = await readBatch(options.batchPath);
			const [records, changed] = await Promise.all([
				Promise.all(batch.rows.map((row) => store.read(row.record))),
				changedRecordIds(options.recordsDirectory),
			]);
			return {
				path: options.batchPath,
				...(batch.note ? { note: batch.note } : {}),
				rows: batch.rows.map((row, index) =>
					rowView(row, records[index] ?? { id: row.record }, changed),
				),
			};
		},
		/** The record of a batch row; undefined when no row names it. */
		async record(id: string): Promise<RecordView | undefined> {
			const row = await findRow(id);
			return row ? await view(row) : undefined;
		},
		/** Sets the record's Review Depth to Segmentation. */
		approve: (request: SaveRequest) => save(request, "approve"),
		/** Makes a record reviewed through Segmentation exactly a Draft again. */
		takeBack: (request: SaveRequest) => save(request, "takeBack"),
	};
}
