import type * as Dumling from "dumling/types";
import { z } from "zod";
import { checkTargetLayers } from "./check-record-layers.js";
import type {
	AnnotationLayer,
	LegacyCase,
	Segment,
	SegmentationTarget,
	Sources,
	SpecRecord,
	SpecRecordId,
	SpecSegmentation,
	SpecTarget,
} from "./corpus-types.js";
import { unitRoutes } from "./generated/routes.js";
import { idLanguage, specRecordIdPattern } from "./ids.js";
import type { SpecCheck, SpecIssue } from "./issues.js";
import { annotationLayers, layerRank } from "./layers.js";
import { looseRouteSchema, recordFileSchema } from "./record-schema.js";

const fileSchema = recordFileSchema({
	route: looseRouteSchema,
	attestation: z.unknown(),
	knowledge: z.unknown(),
});

/**
 * Records one failed check. `layer` is the Annotation Layer it belongs to,
 * undefined for a check of the whole record.
 */
export type IssueSink = (
	layer: AnnotationLayer | undefined,
	check: SpecCheck,
	path: string,
	message: string,
) => void;

/** Collects a record's issues through an `IssueSink`. */
export function issueCollector(record: string): {
	found: SpecIssue[];
	issue: IssueSink;
} {
	const found: SpecIssue[] = [];
	return {
		found,
		issue: (layer, check, path, message) =>
			found.push({
				record,
				check,
				path,
				message,
				...(layer === undefined ? {} : { layer }),
			}),
	};
}

/**
 * The review and validity of a checked record. `errors` fail it: a bad id or
 * shape, a review citing no Rule, or a failing layer it is reviewed through.
 * `issues` are its work: what its Draft layers fail or lack.
 */
export interface LayerVerdict {
	errors: SpecIssue[];
	issues: SpecIssue[];
	reviewDepth?: AnnotationLayer;
	/** The deepest layer that passes, every layer before it included. */
	validThrough?: AnnotationLayer;
}

/**
 * Splits a record's issues by its Review Depth and finds the deepest layer
 * that passes. A layer with an issue fails; so does Knowledge while a target
 * holds none or leaves a structural aspect uncovered, which is work only
 * once the record is reviewed through Knowledge.
 */
export function settleLayers(
	found: readonly SpecIssue[],
	reviewDepth: AnnotationLayer | undefined,
	knowledgeComplete: boolean,
): LayerVerdict {
	const failing = found.flatMap((issue) =>
		issue.layer === undefined ? [] : [layerRank(issue.layer)],
	);
	if (!knowledgeComplete) failing.push(layerRank("Knowledge"));
	const firstFailing = Math.min(annotationLayers.length, ...failing);
	const validThrough = annotationLayers[firstFailing - 1];
	const reviewed = layerRank(reviewDepth);
	const isError = (issue: SpecIssue) =>
		issue.layer === undefined || layerRank(issue.layer) <= reviewed;
	return {
		errors: found.filter(isError),
		issues: found.filter((issue) => !isError(issue)),
		...(reviewDepth === undefined ? {} : { reviewDepth }),
		...(validThrough === undefined ? {} : { validThrough }),
	};
}

/**
 * A checked sentence record. Without errors, its Segmentation loads when that
 * layer passes, and the whole record when its Attestation layer passes too.
 */
export interface RecordCheck extends LayerVerdict {
	segmentation?: SpecSegmentation;
	record?: SpecRecord;
	legacy?: readonly LegacyCase[];
}

/**
 * A record reviewed through any layer cites at least one Rule; a Draft may
 * cite none. The stale-citation guard checks what a record cites, this that
 * it cites something.
 */
export function uncitedIssue(
	record: SpecRecordId,
	reviewed: boolean,
	sources: Pick<Sources, "rules"> | undefined,
): SpecIssue | undefined {
	if (!reviewed || (sources?.rules.length ?? 0) > 0) return undefined;
	return {
		record,
		check: "Uncited",
		path: "sources.rules",
		message: "A reviewed record cites at least one Rule",
	};
}

function claimMemberIndices(
	indices: readonly number[],
	options: {
		readonly path: string;
		readonly check: SpecCheck;
		readonly nonResolvableMessage: string;
		readonly orderMessage: string;
	},
	state: {
		readonly claims: number[];
		readonly resolvable: (index: number) => boolean;
		readonly issue: IssueSink;
	},
): void {
	for (const [m, index] of indices.entries()) {
		const at = `${options.path}.memberSegmentIndices.${m}`;
		if (!state.resolvable(index)) {
			state.issue(
				"Segmentation",
				options.check,
				at,
				options.nonResolvableMessage,
			);
			continue;
		}
		state.claims[index] = (state.claims[index] ?? 0) + 1;
		if (m > 0 && index <= (indices[m - 1] ?? -1))
			state.issue(
				"Segmentation",
				options.check,
				at,
				options.orderMessage,
			);
	}
}

function checkCoverage(
	input: {
		readonly segments: readonly Segment[];
		readonly targetsCount: number;
		readonly noTarget: readonly {
			readonly memberSegmentIndices: readonly number[];
		}[];
		readonly coverage: "Full" | "Partial";
	},
	state: {
		readonly claims: number[];
		readonly resolvable: (index: number) => boolean;
		readonly issue: IssueSink;
	},
): void {
	for (const [n, entry] of input.noTarget.entries())
		claimMemberIndices(
			entry.memberSegmentIndices,
			{
				path: `noTarget.${n}`,
				check: "Coverage",
				nonResolvableMessage: "No Target names ResolvableText Segments",
				orderMessage:
					"No Target names its Segments in sentence order, each once",
			},
			state,
		);
	for (const [index, count] of state.claims.entries()) {
		if (count > 1)
			state.issue(
				"Segmentation",
				"Coverage",
				`segments.${index}`,
				"A Segment belongs to at most one target or No Target entry",
			);
		else if (
			count === 0 &&
			input.coverage === "Full" &&
			state.resolvable(index)
		)
			state.issue(
				"Segmentation",
				"Coverage",
				`segments.${index}`,
				`Full coverage leaves ${JSON.stringify(input.segments[index]?.text)} in no target or No Target entry`,
			);
	}
	if (input.targetsCount === 0 && input.noTarget.length === 0)
		state.issue(
			"Segmentation",
			"Coverage",
			"targets",
			"A record has a target or No Target entry",
		);
}

/**
 * Runs every check that needs only the record itself, each in its Annotation
 * Layer. Segmentation: the Segments spell the sentence, members are
 * ResolvableText Segments in sentence order, routes are Dumling's, and
 * coverage and No Target entries hold. Attestation: strict, normalized
 * Attestations whose Lemma has the target's route and whose members are
 * their Segments, cases against the ADP Case Table, articles against the der
 * and ein cells, Syncretisms against the generated ones, and Grundform.
 * Reading: every target names a valid Reading. Knowledge: every Reading
 * Knowledge passes dumrel, and its coverage agrees with it and covers each
 * structural aspect its route requests. A reviewed layer must pass; a Draft
 * layer may fail or be missing.
 */
export function checkRecord(id: SpecRecordId, input: unknown): RecordCheck {
	const { found, issue } = issueCollector(id);
	const language = idLanguage(specRecordIdPattern, id);
	if (!language)
		issue(
			undefined,
			"Id",
			"",
			"A record path is <language>/<kebab-case name>, in ASCII",
		);
	const file = fileSchema.safeParse(input);
	if (!file.success) {
		for (const error of file.error.issues)
			issue(undefined, "Shape", error.path.join("."), error.message);
		return { errors: found, issues: [] };
	}
	const {
		sentence,
		segments,
		targets,
		noTarget,
		coverage,
		reviewDepth,
		sources,
		provenance,
		legacy,
	} = file.data;

	const checked = checkTargets(
		{ sentence, segments, targets, reviewDepth },
		language,
		issue,
	);
	checkCoverage(
		{ segments, targetsCount: targets.length, noTarget, coverage },
		{ claims: checked.claims, resolvable: checked.resolvable, issue },
	);
	const uncited = uncitedIssue(id, reviewDepth !== undefined, sources);
	if (uncited) found.push(uncited);

	const verdict = settleLayers(found, reviewDepth, checked.knowledgeComplete);
	const result: RecordCheck = {
		...verdict,
		...(legacy === undefined ? {} : { legacy }),
	};
	const { validThrough } = verdict;
	if (verdict.errors.length > 0 || !language || validThrough === undefined)
		return result;
	const base = {
		id,
		language,
		sentence,
		segments,
		noTarget,
		coverage,
		...(reviewDepth === undefined ? {} : { reviewDepth }),
		validThrough,
		sources,
		provenance,
		...(legacy === undefined ? {} : { legacy }),
	};
	result.segmentation = { ...base, targets: checked.segmentation };
	const attested = checked.attested.filter(
		(target): target is SpecTarget => target !== undefined,
	);
	if (attested.length === targets.length)
		result.record = { ...base, targets: attested };
	return result;
}

type TargetFile = z.infer<typeof fileSchema>["targets"][number];

/**
 * The target checks of a sentence record: the Segments spell the sentence, and each target's members and route (Segmentation),
 * its strict Attestation, ADP cases, articles, closed PART, plural-only
 * nouns, Syncretisms and Grundform
 * (Attestation), its Reading (Reading) and its Reading Knowledge and
 * coverage (Knowledge). Returns the Segmentation of each target with a
 * Dumling route, each such target whose Attestation passes, with the Reading
 * and Knowledge that pass, how many targets claim each Segment, and whether
 * every target holds Knowledge that covers its structural aspects.
 */
function checkTargets(
	record: {
		sentence: string;
		segments: readonly Segment[];
		targets: readonly TargetFile[];
		reviewDepth: AnnotationLayer | undefined;
	},
	language: Dumling.Language | undefined,
	issue: IssueSink,
): {
	segmentation: SegmentationTarget[];
	attested: (SpecTarget | undefined)[];
	claims: number[];
	resolvable: (index: number) => boolean;
	knowledgeComplete: boolean;
} {
	const { sentence, segments, targets, reviewDepth } = record;
	if (segments.map((segment) => segment.text).join("") !== sentence)
		issue(
			"Segmentation",
			"Segments",
			"segments",
			"Segment texts must concatenate to the sentence",
		);
	const resolvable = (index: number) =>
		segments[index]?.kind === "ResolvableText";
	const claims = segments.map(() => 0);
	let knowledgeComplete = true;

	const segmentation: SegmentationTarget[] = [];
	const attested: (SpecTarget | undefined)[] = [];
	for (const [t, target] of targets.entries()) {
		const path = `targets.${t}`;
		const indices = target.memberSegmentIndices;
		claimMemberIndices(
			indices,
			{
				path,
				check: "Members",
				nonResolvableMessage: "A member is a ResolvableText Segment",
				orderMessage:
					"Members occur in sentence order, each in its own Segment",
			},
			{ claims, resolvable, issue },
		);
		const { family, kind } = target.route;
		const route = language
			? unitRoutes[language].find(
					(known) => known.family === family && known.kind === kind,
				)
			: undefined;
		if (language && !route)
			issue(
				"Segmentation",
				"Route",
				`${path}.route`,
				`Dumling has no ${language} ${family} ${kind} route`,
			);
		// A target without a Dumling route fails Segmentation, so the record
		// loads none of its targets; its other layers are still checked.
		const segmented: SegmentationTarget | undefined = route && {
			memberSegmentIndices: indices,
			route,
			...(target.notes === undefined ? {} : { notes: target.notes }),
		};
		if (segmented) segmentation.push(segmented);

		const layers = checkTargetLayers(target, segmented, {
			path,
			language,
			segments,
			resolvable,
			reviewDepth,
			issue,
		});
		attested.push(layers.target);
		if (!layers.knowledge) knowledgeComplete = false;
	}
	return { segmentation, attested, claims, resolvable, knowledgeComplete };
}
