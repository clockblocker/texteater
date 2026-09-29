/**
 * One projection per prompt turns Spec Records into that prompt's promptsmith
 * Golden Corpus. The projection decides what a record gives the prompt; this
 * file adds what every prompt shares: origins, record contamination keys,
 * sidecar explanations, status groups, slices, exclusions, and the test set.
 */
import type * as Dumling from "dumling/types";
import type * as Dumspec from "dumspec/types";
import {
	type CaseSelection,
	defineGoldenCaseCollection,
	defineGoldenCaseGroup,
	defineGoldenCorpus,
	type GoldenCase,
	type GoldenCorpus,
	stableJson,
} from "promptsmith";
import type { z } from "zod";
import type { Gold } from "./gold.js";

/**
 * The Spec Record a case comes from, the record's target when the case is
 * one target's, and the Review Status it had, so scores split into Reviewed
 * and Draft.
 */
export type CaseOrigin = {
	readonly record: Dumspec.SpecRecordId;
	readonly target?: number;
	readonly status: Dumspec.ReviewStatus;
};

/**
 * One case a projection makes of a record. `target` is set when the case is
 * one target's, as a resolution or Knowledge case will be; its id is then
 * `<record>#<target>`, otherwise the record id. `facts` is what the
 * evaluator needs and the prompt never sees.
 */
export type ProjectedCase<Input, Output, Facts> = {
	readonly target?: number;
	readonly input: Input;
	readonly idealOutput: Output;
	readonly facts: Facts;
};

/** Why a record gives a prompt no case: coverage, not an error. */
export type Skip = { readonly skip: string };

/**
 * What one prompt makes of a record: its cases, or the reason it has none.
 * `resolution(record, target)` and `knowledge(record, target)` fit the same
 * shape, one case per target.
 */
export type Projection<
	InputSchema extends z.ZodType,
	OutputSchema extends z.ZodType,
	Facts,
> = {
	/** The Golden Corpus route, which also keys the sidecar's explanations. */
	readonly route: string;
	readonly language: Dumling.Language;
	readonly inputSchema: InputSchema;
	readonly outputSchema: OutputSchema;
	readonly project: (
		record: Dumspec.SpecRecord,
	) =>
		| readonly ProjectedCase<
				z.input<InputSchema>,
				z.input<OutputSchema>,
				Facts
		  >[]
		| Skip;
};

export type SkippedRecord = {
	readonly record: Dumspec.SpecRecordId;
	readonly status: Dumspec.ReviewStatus;
	readonly reason: string;
	/** The record whose case has the same input, for a duplicate. */
	readonly sameInputAs?: Dumspec.SpecRecordId;
};

/** The reason a record is skipped when another record gave its input. */
export const sameInputReason = "Same input as another record";

/** The collection holding every case; its groups are the Review Statuses. */
export const specCollection = "dumspec";

export type ProjectedCorpus<
	InputSchema extends z.ZodType,
	OutputSchema extends z.ZodType,
	Facts,
> = {
	/**
	 * One case per projected record or target, in record order. Its groups
	 * `dumspec.Reviewed` and `dumspec.Draft` split it by Review Status.
	 */
	readonly corpus: GoldenCorpus<InputSchema, OutputSchema>;
	readonly reviewed: CaseSelection<InputSchema, OutputSchema>;
	readonly draft: CaseSelection<InputSchema, OutputSchema>;
	/** Cases of the records the sidecar excludes. */
	readonly excluded: CaseSelection<InputSchema, OutputSchema>;
	/** The sidecar's slices, each the cases of its records. */
	readonly slices: Readonly<
		Record<string, CaseSelection<InputSchema, OutputSchema>>
	>;
	readonly origins: Readonly<Record<string, CaseOrigin>>;
	readonly facts: Readonly<Record<string, Facts>>;
	/** Records of the projection's language that gave no case, and why. */
	readonly skipped: readonly SkippedRecord[];
	/**
	 * The cases a prompt with these demonstrations is tested on: Reviewed −
	 * demonstrations − excluded, where a demonstration removes every case of
	 * its record, so no test case shares a record with a demonstration.
	 * `alsoWithout` removes the records of demonstrations from other
	 * corpora, for a chain of prompts.
	 */
	readonly testSet: (
		demonstrations: CaseSelection<InputSchema, OutputSchema>,
		alsoWithout?: Iterable<Dumspec.SpecRecordId>,
	) => CaseSelection<InputSchema, OutputSchema>;
	/** The records a selection's cases come from, in selection order. */
	readonly recordsOf: (
		selection: CaseSelection<InputSchema, OutputSchema>,
	) => readonly Dumspec.SpecRecordId[];
};

/**
 * The Review Status of one target. It lives on the record today; read it only
 * here, so it can move to each target without touching the projections. A
 * whole-record case is Reviewed only when the record is.
 */
function statusOf(
	record: Dumspec.SpecRecord,
	_target: number | undefined,
): Dumspec.ReviewStatus {
	return record.status;
}

type Entry<Input, Output, Facts> = {
	readonly id: string;
	readonly record: Dumspec.SpecRecord;
	readonly projected: ProjectedCase<Input, Output, Facts>;
};

/**
 * Builds one prompt's corpus from the gold. Records of other languages are
 * not the projection's and go unreported. When two records give the same
 * input, the corpus keeps one: a record the sidecar keeps before an excluded
 * one, a Reviewed before a Draft, then the first by id; the other is
 * skipped. Throws when the sidecar explains a case the corpus lacks.
 */
export function projectCorpus<
	InputSchema extends z.ZodType,
	OutputSchema extends z.ZodType,
	Facts,
>(
	projection: Projection<InputSchema, OutputSchema, Facts>,
	gold: Gold,
): ProjectedCorpus<InputSchema, OutputSchema, Facts> {
	const { sidecar } = gold;
	const excludedRecords = new Set(Object.keys(sidecar.exclusions));
	const records = gold.records.filter(
		(record) => record.language === projection.language,
	);
	const skipped: SkippedRecord[] = [];
	const entries: Entry<z.input<InputSchema>, z.input<OutputSchema>, Facts>[] =
		[];
	const rank = (record: Dumspec.SpecRecord) =>
		(excludedRecords.has(record.id) ? 2 : 0) +
		(record.status === "Reviewed" ? 0 : 1);
	const inputs = new Map<string, Dumspec.SpecRecordId>();
	for (const record of records.toSorted(
		(left, right) => rank(left) - rank(right),
	)) {
		const result = projection.project(record);
		if ("skip" in result) {
			skipped.push({
				record: record.id,
				status: record.status,
				reason: result.skip,
			});
			continue;
		}
		const fingerprints = result.map(({ input }) => stableJson(input));
		const taken = fingerprints.flatMap(
			(fingerprint) => inputs.get(fingerprint) ?? [],
		);
		const [first] = taken;
		if (first !== undefined) {
			skipped.push({
				record: record.id,
				status: record.status,
				reason: sameInputReason,
				sameInputAs: first,
			});
			continue;
		}
		for (const fingerprint of fingerprints)
			inputs.set(fingerprint, record.id);
		for (const projected of result)
			entries.push({
				id:
					projected.target === undefined
						? record.id
						: `${record.id}#${projected.target}`,
				record,
				projected,
			});
	}
	const order = new Map(records.map((record, index) => [record.id, index]));
	const position = (id: Dumspec.SpecRecordId) => order.get(id) ?? 0;
	entries.sort(
		(left, right) =>
			position(left.record.id) - position(right.record.id) ||
			(left.projected.target ?? 0) - (right.projected.target ?? 0),
	);
	skipped.sort(
		(left, right) => position(left.record) - position(right.record),
	);

	const explanations = sidecar.explanations[projection.route] ?? {};
	const ids = new Set(entries.map(({ id }) => id));
	const unexplained = Object.keys(explanations).filter((id) => !ids.has(id));
	if (unexplained.length > 0)
		throw Error(
			`The sidecar explains cases ${projection.route} does not have: ${unexplained.join(", ")}`,
		);

	const origins: Record<string, CaseOrigin> = {};
	const facts: Record<string, Facts> = {};
	const groups: Record<
		Dumspec.ReviewStatus,
		Record<string, GoldenCase<z.input<InputSchema>, z.input<OutputSchema>>>
	> = { Reviewed: {}, Draft: {} };
	for (const { id, record, projected } of entries) {
		const status = statusOf(record, projected.target);
		origins[id] = {
			record: record.id,
			...(projected.target === undefined
				? {}
				: { target: projected.target }),
			status,
		};
		facts[id] = projected.facts;
		const explanation = explanations[id];
		groups[status][id] = {
			input: projected.input,
			idealOutput: projected.idealOutput,
			contaminationKeys: [record.id],
			...(explanation === undefined ? {} : { explanation }),
		};
	}
	const corpus = defineGoldenCorpus({
		route: projection.route,
		inputSchema: projection.inputSchema,
		outputSchema: projection.outputSchema,
		collections: {
			[specCollection]: defineGoldenCaseCollection(
				`dumspec:records/${projection.language}`,
				{
					groups: {
						Reviewed: defineGoldenCaseGroup(groups.Reviewed),
						Draft: defineGoldenCaseGroup(groups.Draft),
					},
					cases: {},
				},
			),
		},
	});
	const casesOf = (recordIds: Iterable<string>) => {
		const wanted = new Set(recordIds);
		return corpus.select(
			entries
				.filter(({ record }) => wanted.has(record.id))
				.map(({ id }) => id),
		);
	};
	const recordsOf = (selection: CaseSelection<InputSchema, OutputSchema>) => [
		...new Set(
			selection.ids.map((id) => {
				const origin = origins[id];
				if (!origin)
					throw Error(`${id} is not a case of ${corpus.route}`);
				return origin.record;
			}),
		),
	];
	const reviewed = corpus.select(Object.keys(groups.Reviewed));
	const excluded = casesOf(excludedRecords);
	return {
		corpus,
		reviewed,
		draft: corpus.select(Object.keys(groups.Draft)),
		excluded,
		slices: Object.fromEntries(
			Object.entries(sidecar.slices).map(([name, slice]) => [
				name,
				casesOf(slice.records),
			]),
		),
		origins,
		facts,
		skipped,
		testSet(demonstrations, alsoWithout = []) {
			const without = casesOf([
				...recordsOf(demonstrations),
				...alsoWithout,
			]);
			return reviewed.difference(without).difference(excluded);
		},
		recordsOf,
	};
}
