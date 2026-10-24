import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge } from "dumrel";
import { z } from "zod";
import { breakdownInvariantIssues } from "./breakdown-invariants.js";
import {
	type IssueSink,
	issueCollector,
	type LayerVerdict,
	settleLayers,
	uncitedIssue,
} from "./check-record.js";
import type {
	BreakdownKnowledge,
	BreakdownRecord,
	BreakdownRecordId,
} from "./corpus-types.js";
import { breakdownRecordIdPattern, idLanguage } from "./ids.js";
import { breakdownRecordFileSchema } from "./record-schema.js";
import { sameValue } from "./same-value.js";

const fileSchema = breakdownRecordFileSchema({
	reading: z.unknown(),
	breakdown: z.unknown(),
	source: z.unknown(),
});

/**
 * A checked Breakdown Record. Without errors, it loads when its one
 * Annotation Layer, Segmentation, passes.
 */
export interface BreakdownRecordCheck extends LayerVerdict {
	record?: BreakdownRecord;
}

/**
 * Runs every check a Breakdown Record needs (ADR 0050, ADR 0051). Its parts
 * carry no Attestation and no Reading, so every check of its content belongs
 * to Segmentation (ADR 0037): a strict, normalized owning Reading of the
 * record's language; a Breakdown or Source that dumrel's
 * `parseReadingKnowledge` accepts for that Reading, stored as it normalizes
 * it; and the invariants dumrel leaves to gold. A reviewed record must pass
 * and cite a Rule.
 */
export function checkBreakdownRecord(
	id: BreakdownRecordId,
	input: unknown,
): BreakdownRecordCheck {
	const { found, issue } = issueCollector(id);
	const language = idLanguage(breakdownRecordIdPattern, id);
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
	const { reviewDepth, sources } = file.data;
	const reading = checkOwner(file.data.reading, language, issue);
	const knowledge =
		reading && checkKnowledge(reading, file.data.knowledge, issue);
	if (reading && knowledge)
		for (const { path, message } of breakdownInvariantIssues(
			reading,
			knowledge,
		))
			issue("Segmentation", "Breakdown", path, message);
	const uncited = uncitedIssue(id, reviewDepth !== undefined, sources);
	if (uncited) found.push(uncited);

	const settled = settleLayers(found, reviewDepth, true);
	// Segmentation is a Breakdown Record's only layer.
	const verdict: LayerVerdict = {
		errors: settled.errors,
		issues: settled.issues,
		...(reviewDepth === undefined ? {} : { reviewDepth }),
		...(settled.validThrough === undefined
			? {}
			: { validThrough: "Segmentation" }),
	};
	if (
		verdict.errors.length > 0 ||
		verdict.validThrough === undefined ||
		!language ||
		!reading ||
		!knowledge
	)
		return verdict;
	return {
		...verdict,
		record: {
			id,
			language,
			reading,
			knowledge,
			...(reviewDepth === undefined ? {} : { reviewDepth }),
			sources,
		},
	};
}

/** Parses the owning Reading: strict, normalized and of the record's language. */
function checkOwner(
	input: unknown,
	language: Dumling.Language | undefined,
	issue: IssueSink,
): Dumling.Reading | undefined {
	const parsed = parseUnit(input);
	if (!parsed.success) {
		for (const error of parsed.error.issues)
			issue(
				"Segmentation",
				"Reading",
				["reading", ...error.path].join("."),
				error.message,
			);
		return undefined;
	}
	if (parsed.chain.unitKind !== "Reading") {
		issue(
			"Segmentation",
			"Reading",
			"reading.unitKind",
			"A Breakdown Record is owned by a Reading",
		);
		return undefined;
	}
	const reading = parsed.chain.value;
	if (!sameValue(reading, input))
		issue(
			"Segmentation",
			"Reading",
			"reading",
			"Store the Reading exactly as parseUnit normalizes it",
		);
	if (reading.lemma.family === "Foreign")
		issue(
			"Segmentation",
			"Reading",
			"reading.lemma.family",
			"A Foreign Reading has no Breakdown",
		);
	if (language && reading.lemma.language !== language)
		issue(
			"Segmentation",
			"Reading",
			"reading.lemma.language",
			`A ${language} Breakdown Record is owned by a ${language} Reading`,
		);
	return reading;
}

/**
 * Checks the Breakdown or Source with dumrel against the owning Reading:
 * piece targets, the spelled-back Canonical Form, a Source or Constituents
 * but not both. The record stores what dumrel returns.
 */
function checkKnowledge(
	reading: Dumling.Reading,
	input: { breakdown?: unknown; source?: unknown },
	issue: IssueSink,
): BreakdownKnowledge | undefined {
	if (input.breakdown === undefined && input.source === undefined) {
		issue(
			"Segmentation",
			"Breakdown",
			"knowledge",
			"A Breakdown Record holds a Breakdown or a Source",
		);
		return undefined;
	}
	const parsed = parseReadingKnowledge({ source: reading, knowledge: input });
	if (!parsed.success) {
		for (const error of parsed.error.issues)
			issue(
				"Segmentation",
				"Breakdown",
				// dumrel's paths may start at the knowledge it was given.
				[
					"knowledge",
					...error.path.slice(error.path[0] === "knowledge" ? 1 : 0),
				].join("."),
				error.message,
			);
		return undefined;
	}
	const { breakdown, source } = parsed.value;
	const knowledge: BreakdownKnowledge = {
		...(breakdown === undefined ? {} : { breakdown }),
		...(source === undefined ? {} : { source }),
	};
	if (!sameValue(knowledge, input))
		issue(
			"Segmentation",
			"Breakdown",
			"knowledge",
			"Store the Breakdown and Source exactly as dumrel normalizes them",
		);
	return knowledge;
}
