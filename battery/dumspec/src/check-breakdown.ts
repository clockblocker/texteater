import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { z } from "zod";
import {
	checkTargets,
	type RecordCheck,
	sameValue,
	targetsWithoutReading,
	uncitedIssue,
} from "./check-record.js";
import type { SpecCheck, SpecIssue } from "./issues.js";
import { breakdownRecordFileSchema } from "./record-schema.js";
import type { BreakdownRecord, BreakdownRecordId } from "./types.js";

const idPattern = /^breakdown\/(de|en|he)\/[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const fileSchema = breakdownRecordFileSchema(z.unknown(), {
	attestation: z.unknown(),
	knowledge: z.unknown(),
});
const brokenDown: readonly Dumling.Family[] = ["Locution", "Saying"];

/**
 * A failed Breakdown Record names its status and the targets that name no
 * Reading once its shape parses, as a failed sentence record does.
 */
export type BreakdownRecordCheck =
	| { success: true; record: BreakdownRecord }
	| Extract<RecordCheck, { success: false }>;

/**
 * Runs every check a Breakdown Record needs: its id and shape, a strict
 * Locution or Saying Lemma whose Canonical Form is the wording, the target
 * checks sentence records share, Lexeme targets only, none covering the whole
 * wording, and every ResolvableText Segment in exactly one target. A Reviewed
 * record names every target's Reading and cites a Rule.
 */
export function checkBreakdownRecord(
	id: BreakdownRecordId,
	input: unknown,
): BreakdownRecordCheck {
	const issues: SpecIssue[] = [];
	const issue = (check: SpecCheck, path: string, message: string) =>
		issues.push({ record: id, check, path, message });

	const language = idPattern.exec(id)?.[1] as Dumling.Language | undefined;
	if (!language)
		issue(
			"Id",
			"",
			"A Breakdown Record path is breakdown/<language>/<kebab-case name>, in ASCII",
		);
	const file = fileSchema.safeParse(input);
	if (!file.success) {
		for (const error of file.error.issues)
			issue("Shape", error.path.join("."), error.message);
		return { success: false, issues };
	}
	const { sentence, segments, targets, status, sources } = file.data;

	const lemma = checkLemma(file.data.lemma, language, issue);
	if (lemma && lemma.canonicalForm !== sentence)
		issue(
			"Wording",
			"sentence",
			`The wording is the Lemma's Canonical Form ${JSON.stringify(lemma.canonicalForm)}`,
		);

	const { parsedTargets, claims, resolvable } = checkTargets(
		{ sentence, segments, targets, status },
		language,
		issue,
	);
	const wording = segments.flatMap((_, index) =>
		resolvable(index) ? [index] : [],
	);
	for (const [t, target] of parsedTargets.entries()) {
		const path = `targets.${t}`;
		if (target.attestation.surface.lemma.family !== "Lexeme")
			issue(
				"Breakdown",
				`${path}.attestation.surface.lemma.family`,
				"A Breakdown breaks its Lemma down into Lexemes",
			);
		if (
			wording.length > 0 &&
			wording.every((index) =>
				target.memberSegmentIndices.includes(index),
			)
		)
			issue(
				"Breakdown",
				`${path}.memberSegmentIndices`,
				"A Breakdown never returns the whole Lemma as one target",
			);
	}
	for (const [index, count] of claims.entries()) {
		if (count > 1)
			issue(
				"Coverage",
				`segments.${index}`,
				"A Segment belongs to at most one target",
			);
		else if (count === 0 && resolvable(index))
			issue(
				"Coverage",
				`segments.${index}`,
				`A Breakdown covers every word; ${JSON.stringify(segments[index]?.text)} is in no target`,
			);
	}
	const uncited = uncitedIssue(id, status, sources);
	if (uncited) issues.push(uncited);

	if (issues.length > 0 || !language || !lemma)
		return {
			success: false,
			issues,
			status,
			targetsWithoutReading: targetsWithoutReading(targets),
		};
	return {
		success: true,
		record: {
			id,
			language,
			lemma,
			sentence,
			segments,
			targets: parsedTargets,
			status,
			sources,
		},
	};
}

/** Parses the broken-down Lemma: a strict, normalized Locution or Saying. */
function checkLemma(
	input: unknown,
	language: Dumling.Language | undefined,
	issue: (check: SpecCheck, path: string, message: string) => void,
): Dumling.Lemma | undefined {
	const parsed = parseUnit(input);
	if (!parsed.success) {
		for (const error of parsed.error.issues)
			issue("Lemma", ["lemma", ...error.path].join("."), error.message);
		return undefined;
	}
	if (parsed.chain.unitKind !== "Lemma") {
		issue("Lemma", "lemma.unitKind", "Expected a Lemma");
		return undefined;
	}
	const lemma = parsed.chain.value;
	if (!sameValue(lemma, input))
		issue(
			"Lemma",
			"lemma",
			"Store the Lemma exactly as parseUnit normalizes it",
		);
	if (!brokenDown.includes(lemma.family))
		issue(
			"Lemma",
			"lemma.family",
			"A Breakdown Record breaks down a Locution or Saying",
		);
	if (language && lemma.language !== language)
		issue(
			"Lemma",
			"lemma.language",
			`A ${language} Breakdown Record breaks down a ${language} Lemma`,
		);
	return lemma;
}
