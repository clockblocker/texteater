import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { z } from "zod";
import {
	checkTargets,
	type IssueSink,
	issueCollector,
	type LayerVerdict,
	settleLayers,
	uncitedIssue,
} from "./check-record.js";
import type {
	BreakdownRecord,
	BreakdownRecordId,
	SpecTarget,
} from "./corpus-types.js";
import { breakdownRecordIdPattern } from "./ids.js";
import { layerRank } from "./layers.js";
import {
	breakdownRecordFileSchema,
	looseRouteSchema,
} from "./record-schema.js";
import { sameValue } from "./same-value.js";

const fileSchema = breakdownRecordFileSchema(z.unknown(), {
	route: looseRouteSchema,
	attestation: z.unknown(),
	knowledge: z.unknown(),
});
const brokenDown: readonly Dumling.Family[] = ["Locution", "Saying"];

/**
 * A checked Breakdown Record. Without errors, it loads when its Attestation
 * layer passes.
 */
export interface BreakdownRecordCheck extends LayerVerdict {
	record?: BreakdownRecord;
}

/**
 * Runs every check a Breakdown Record needs, each in its Annotation Layer.
 * Segmentation: its id and shape, a strict Locution or Saying Lemma whose
 * Canonical Form is the wording, Lexeme routes only, none covering the whole
 * wording, and every ResolvableText Segment in exactly one target. The deeper
 * layers are the target checks sentence records share. A reviewed layer must
 * pass, and a reviewed record cites a Rule.
 */
export function checkBreakdownRecord(
	id: BreakdownRecordId,
	input: unknown,
): BreakdownRecordCheck {
	const { found, issue } = issueCollector(id);
	const language = breakdownRecordIdPattern.exec(id)?.[1] as
		| Dumling.Language
		| undefined;
	if (!language)
		issue(
			undefined,
			"Id",
			"",
			"A Breakdown Record path is breakdown/<language>/<kebab-case name>, in ASCII",
		);
	const file = fileSchema.safeParse(input);
	if (!file.success) {
		for (const error of file.error.issues)
			issue(undefined, "Shape", error.path.join("."), error.message);
		return { errors: found, issues: [] };
	}
	const { sentence, segments, targets, reviewDepth, sources } = file.data;

	const lemma = checkLemma(file.data.lemma, language, issue);
	if (lemma && lemma.canonicalForm !== sentence)
		issue(
			"Segmentation",
			"Wording",
			"sentence",
			`The wording is the Lemma's Canonical Form ${JSON.stringify(lemma.canonicalForm)}`,
		);

	const checked = checkTargets(
		{ sentence, segments, targets, reviewDepth },
		language,
		issue,
	);
	const { claims, resolvable } = checked;
	const wording = segments.flatMap((_, index) =>
		resolvable(index) ? [index] : [],
	);
	for (const [t, target] of checked.segmentation.entries()) {
		const path = `targets.${t}`;
		if (target.route.family !== "Lexeme")
			issue(
				"Segmentation",
				"Breakdown",
				`${path}.route.family`,
				"A Breakdown breaks its Lemma down into Lexemes",
			);
		if (
			wording.length > 0 &&
			wording.every((index) =>
				target.memberSegmentIndices.includes(index),
			)
		)
			issue(
				"Segmentation",
				"Breakdown",
				`${path}.memberSegmentIndices`,
				"A Breakdown never returns the whole Lemma as one target",
			);
	}
	for (const [index, count] of claims.entries()) {
		if (count > 1)
			issue(
				"Segmentation",
				"Coverage",
				`segments.${index}`,
				"A Segment belongs to at most one target",
			);
		else if (count === 0 && resolvable(index))
			issue(
				"Segmentation",
				"Coverage",
				`segments.${index}`,
				`A Breakdown covers every word; ${JSON.stringify(segments[index]?.text)} is in no target`,
			);
	}
	const uncited = uncitedIssue(id, reviewDepth !== undefined, sources);
	if (uncited) found.push(uncited);

	const verdict = settleLayers(found, reviewDepth, checked.knowledgeComplete);
	const attested = checked.attested.filter(
		(target): target is SpecTarget => target !== undefined,
	);
	if (
		verdict.errors.length > 0 ||
		!language ||
		!lemma ||
		verdict.validThrough === undefined ||
		layerRank(verdict.validThrough) < layerRank("Attestation") ||
		attested.length !== targets.length
	)
		return verdict;
	return {
		...verdict,
		record: {
			id,
			language,
			lemma,
			sentence,
			segments,
			targets: attested,
			...(reviewDepth === undefined ? {} : { reviewDepth }),
			validThrough: verdict.validThrough,
			sources,
		},
	};
}

/** Parses the broken-down Lemma: a strict, normalized Locution or Saying. */
function checkLemma(
	input: unknown,
	language: Dumling.Language | undefined,
	issue: IssueSink,
): Dumling.Lemma | undefined {
	const parsed = parseUnit(input);
	if (!parsed.success) {
		for (const error of parsed.error.issues)
			issue(
				"Segmentation",
				"Lemma",
				["lemma", ...error.path].join("."),
				error.message,
			);
		return undefined;
	}
	if (parsed.chain.unitKind !== "Lemma") {
		issue("Segmentation", "Lemma", "lemma.unitKind", "Expected a Lemma");
		return undefined;
	}
	const lemma = parsed.chain.value;
	if (!sameValue(lemma, input))
		issue(
			"Segmentation",
			"Lemma",
			"lemma",
			"Store the Lemma exactly as parseUnit normalizes it",
		);
	if (!brokenDown.includes(lemma.family))
		issue(
			"Segmentation",
			"Lemma",
			"lemma.family",
			"A Breakdown Record breaks down a Locution or Saying",
		);
	if (language && lemma.language !== language)
		issue(
			"Segmentation",
			"Lemma",
			"lemma.language",
			`A ${language} Breakdown Record breaks down a ${language} Lemma`,
		);
	return lemma;
}
