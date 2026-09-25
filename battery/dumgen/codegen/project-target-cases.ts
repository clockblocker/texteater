import { readFileSync } from "node:fs";
import type * as Dumspec from "dumspec/types";
import { z } from "zod";

const flags = {
	demonstration: z.literal(true).optional(),
	evaluation: z.literal(true).optional(),
	slices: z.array(z.string().min(1)).min(1).optional(),
};
const clickKey = /^(?<record>[a-z]{2}(?:\/[a-z0-9-]+)+)@(?<segment>\d+)$/u;

/**
 * Target classification's sidecar: Dumgen's use of Spec Record Segments. A
 * case served by a record is keyed by its click, `<record id>@<Segment
 * index>`, and names the case id it keeps, its contamination keys and
 * sources, and its explanation when that is not the target's rationale
 * (`null` when the case has none). A case still in
 * `source-data.json` is keyed by its case id and holds only its flags. The
 * order of `cases` is the order of every list the stage projects.
 */
const sidecarSchema = z.strictObject({
	slices: z.record(z.string().min(1), z.string().min(1)),
	cases: z.record(
		z.string().min(1),
		z.union([
			z.strictObject({
				id: z.string().min(1),
				...flags,
				contaminationKeys: z.array(z.string().min(1)).min(1).optional(),
				explanation: z.string().min(1).nullable().optional(),
				sources: z
					.array(
						z.strictObject({
							title: z.string().min(1),
							url: z.url(),
							supports: z.string().min(1),
						}),
					)
					.min(1)
					.optional(),
			}),
			z.strictObject(flags),
		]),
	),
});
export type TargetSidecar = z.infer<typeof sidecarSchema>;

export type ProjectedTargetCase = {
	input: {
		clickedSegmentIndex: number;
		segments: { kind: Dumspec.SegmentKind; text: string }[];
	};
	idealOutput:
		| { family: string; kind: string; memberSegmentIndices: number[] }
		| { decision: "Unresolved" };
	explanation?: string;
	contaminationKeys?: string[];
	sources?: Dumspec.Reference[];
};

export type ProjectedTargetCases = {
	/** Every case id, from records and from `source-data.json`, in sidecar order. */
	caseIds: string[];
	demonstrationIds: string[];
	evaluationCaseIds: string[];
	slices: Record<string, string[]>;
	/** The cases Spec Records serve; the rest stay in `source-data.json`. */
	cases: Record<string, ProjectedTargetCase>;
};

/** Reads the stage's sidecar from `directory`. */
export function readTargetSidecar(directory: URL): TargetSidecar {
	return sidecarSchema.parse(
		JSON.parse(readFileSync(new URL("sidecar.json", directory), "utf8")),
	);
}

/** The record and Segment a sidecar key clicks, or undefined for a case id. */
export function clickOf(key: string) {
	const match = clickKey.exec(key)?.groups;
	return match
		? { record: match.record as string, segment: Number(match.segment) }
		: undefined;
}

/**
 * Projects one click on a Spec Record (ADR 0037). Every ResolvableText
 * Segment of a Full record and every member of a Partial record's target is
 * a case: the ideal output is the target holding the Segment, or Unresolved
 * for a No Target entry. The input drops Segment surfaces, which the
 * classifier reads from the fusion table and the corpus never stored.
 */
export function projectTargetCase(
	record: Dumspec.SpecRecord,
	segment: number,
): ProjectedTargetCase {
	const target = record.targets.find((candidate) =>
		candidate.memberSegmentIndices.includes(segment),
	);
	const noTarget = record.noTarget.find((entry) => entry.segment === segment);
	if (!target && !noTarget)
		throw Error(
			`Segment ${segment} of ${record.id} is in no target or No Target entry`,
		);
	const lemma = target?.attestation.surface.lemma;
	return {
		input: {
			clickedSegmentIndex: segment,
			segments: record.segments.map(({ kind, text }) => ({ kind, text })),
		},
		idealOutput:
			target && lemma
				? {
						family: lemma.family,
						kind: lemma.kind,
						memberSegmentIndices: [...target.memberSegmentIndices],
					}
				: { decision: "Unresolved" },
		...((target?.notes?.rationale ?? noTarget?.reason)
			? { explanation: target?.notes?.rationale ?? noTarget?.reason }
			: {}),
	};
}

/**
 * Projects the stage's cases: each click the sidecar keeps becomes the case
 * it names, and the lists keep the sidecar's order. Cases keyed by case id
 * stay in `source-data.json` and enter only the id lists.
 */
export function projectTargetCases(
	sidecar: TargetSidecar,
	records: readonly Dumspec.SpecRecord[],
): ProjectedTargetCases {
	const byId = new Map(records.map((record) => [record.id, record]));
	const projected: ProjectedTargetCases = {
		caseIds: [],
		demonstrationIds: [],
		evaluationCaseIds: [],
		slices: Object.fromEntries(
			Object.keys(sidecar.slices).map((name) => [name, []]),
		),
		cases: {},
	};
	for (const [key, entry] of Object.entries(sidecar.cases)) {
		let id = key;
		if ("id" in entry) {
			id = entry.id;
			const click = clickOf(key);
			const record = byId.get(click?.record ?? "");
			if (!click || !record) throw Error(`No Spec Record for ${key}`);
			const { explanation, ...projectedCase } = projectTargetCase(
				record,
				click.segment,
			);
			const ownExplanation =
				entry.explanation === undefined
					? explanation
					: (entry.explanation ?? undefined);
			projected.cases[id] = {
				...projectedCase,
				...(ownExplanation ? { explanation: ownExplanation } : {}),
				...(entry.contaminationKeys
					? { contaminationKeys: entry.contaminationKeys }
					: {}),
				...(entry.sources ? { sources: entry.sources } : {}),
			};
		}
		projected.caseIds.push(id);
		if (entry.demonstration) projected.demonstrationIds.push(id);
		if (entry.evaluation) projected.evaluationCaseIds.push(id);
		for (const name of entry.slices ?? []) {
			const slice = projected.slices[name];
			if (!slice) throw Error(`${key} names unknown slice ${name}`);
			slice.push(id);
		}
	}
	return projected;
}
