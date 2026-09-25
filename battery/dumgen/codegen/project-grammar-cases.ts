import { readFileSync } from "node:fs";
import type * as Dumspec from "dumspec/types";
import { z } from "zod";
import { grammarOutputOf } from "../src/evaluation/grammar-operation.js";
import { type CaseOrigin, caseOriginOf } from "./case-origin.js";

const flags = {
	demonstration: z.literal(true).optional(),
	evaluation: z.literal(true).optional(),
	slices: z.array(z.string().min(1)).min(1).optional(),
	contaminationKeys: z.array(z.string().min(1)).min(1).optional(),
};
const targetKey = /^(?<record>[a-z]{2}(?:\/[a-z0-9-]+)+)#(?<target>\d+)$/u;

/**
 * A grammatical-resolution route's sidecar: Dumgen's use of Spec Record
 * targets. `cases` is keyed by target id, `<record id>#<target index>`, and
 * names the case id each target keeps. A case whose answer is not a Dumling
 * value (an Unresolved or MoreContextRequired decision, or a cell only the
 * neighbouring Sentences decide) is keyed by its case id and holds its own
 * input and answer. The order of `cases` is the order of every list the
 * route projects.
 */
const sidecarSchema = z.strictObject({
	slices: z.record(z.string().min(1), z.string().min(1)),
	cases: z.record(
		z.string().min(1),
		z.union([
			z.strictObject({ id: z.string().min(1), ...flags }),
			z.strictObject({
				input: z.record(z.string(), z.unknown()),
				idealOutput: z.record(z.string(), z.unknown()),
				explanation: z.string().min(1).optional(),
				...flags,
			}),
		]),
	),
});

/**
 * `origins` names the Spec Record target of every case projected from one;
 * a case the sidecar owns has none.
 */
export type ProjectedGrammarCases = {
	demonstrationIds: string[];
	evaluationCaseIds: string[];
	slices: Record<string, string[]>;
	cases: Record<
		string,
		{
			input: { markedContext: string; members: string[] };
			idealOutput: unknown;
			explanation?: string;
			contaminationKeys?: string[];
		}
	>;
	origins: Record<string, CaseOrigin>;
};

/** Reads a route's sidecar from `directory`. */
export function readGrammarSidecar(directory: URL) {
	return sidecarSchema.parse(
		JSON.parse(readFileSync(new URL("sidecar.json", directory), "utf8")),
	);
}

/**
 * Projects a route's retained cases from Spec Records: each target becomes
 * `{input, idealOutput}` with its members marked in the record's Sentence,
 * and its rationale as the explanation.
 */
export function projectGrammarCases(
	sidecar: ReturnType<typeof readGrammarSidecar>,
	records: readonly Dumspec.SpecRecord[],
): ProjectedGrammarCases {
	const byId = new Map(records.map((record) => [record.id, record]));
	const projected: ProjectedGrammarCases = {
		demonstrationIds: [],
		evaluationCaseIds: [],
		slices: Object.fromEntries(
			Object.keys(sidecar.slices).map((name) => [name, []]),
		),
		cases: {},
		origins: {},
	};
	for (const [key, entry] of Object.entries(sidecar.cases)) {
		let id: string;
		if ("id" in entry) {
			id = entry.id;
			const match = targetKey.exec(key)?.groups;
			const record = byId.get(match?.record ?? "");
			const target = record?.targets[Number(match?.target)];
			if (!record || !target) throw Error(`No Spec Record target ${key}`);
			projected.origins[id] = caseOriginOf(record, Number(match?.target));
			const members = new Set(target.memberSegmentIndices);
			projected.cases[id] = {
				input: {
					markedContext: record.segments
						.map((segment, index) =>
							members.has(index)
								? `<TARGET>${segment.text}</TARGET>`
								: segment.text,
						)
						.join(""),
					members: target.memberSegmentIndices.map(
						(index) => record.segments[index]?.text ?? "",
					),
				},
				idealOutput: grammarOutputOf(target.attestation),
				...(target.notes?.rationale
					? { explanation: target.notes.rationale }
					: {}),
				...(entry.contaminationKeys
					? { contaminationKeys: entry.contaminationKeys }
					: {}),
			};
		} else {
			id = key;
			const {
				demonstration: _demonstration,
				evaluation: _evaluation,
				slices: _slices,
				...owned
			} = entry;
			projected.cases[id] =
				owned as ProjectedGrammarCases["cases"][string];
		}
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
