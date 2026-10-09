import { parseUnit, routeOf } from "dumling";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { z } from "zod";
import { languageAttestationIssues } from "./attestation-checks.js";
import { authoredReadingIssues } from "./check-authored-readings.js";
import { knowledgeCoverageIssues } from "./check-knowledge-coverage.js";
import { attestationSyncretismIssues } from "./check-syncretisms.js";
import type {
	AnnotationLayer,
	KnowledgeCoverage,
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
import { checkIfGrundform } from "./grundform/check-if-grundform.js";
import { idLanguage, specRecordIdPattern } from "./ids.js";
import type { SpecCheck, SpecIssue } from "./issues.js";
import { annotationLayers, layerRank } from "./layers.js";
import { looseRouteSchema, recordFileSchema } from "./record-schema.js";
import { sameValue } from "./same-value.js";

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
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
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
	const { claims, resolvable } = checked;
	for (const [n, entry] of noTarget.entries()) {
		const indices = entry.memberSegmentIndices;
		for (const [m, index] of indices.entries()) {
			const at = `noTarget.${n}.memberSegmentIndices.${m}`;
			if (!resolvable(index)) {
				issue(
					"Segmentation",
					"Coverage",
					at,
					"No Target names ResolvableText Segments",
				);
				continue;
			}
			claims[index] = (claims[index] ?? 0) + 1;
			if (m > 0 && index <= (indices[m - 1] ?? -1))
				issue(
					"Segmentation",
					"Coverage",
					at,
					"No Target names its Segments in sentence order, each once",
				);
		}
	}
	for (const [index, count] of claims.entries()) {
		if (count > 1)
			issue(
				"Segmentation",
				"Coverage",
				`segments.${index}`,
				"A Segment belongs to at most one target or No Target entry",
			);
		else if (count === 0 && coverage === "Full" && resolvable(index))
			issue(
				"Segmentation",
				"Coverage",
				`segments.${index}`,
				`Full coverage leaves ${JSON.stringify(segments[index]?.text)} in no target or No Target entry`,
			);
	}
	if (targets.length === 0 && noTarget.length === 0)
		issue(
			"Segmentation",
			"Coverage",
			"targets",
			"A record has a target or No Target entry",
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
 * The checks a sentence record and a Breakdown Record share: the Segments
 * spell the sentence, and each target's members and route (Segmentation),
 * its strict Attestation, ADP cases, articles, closed PART, plural-only
 * nouns, Syncretisms and Grundform
 * (Attestation), its Reading (Reading) and its Reading Knowledge and
 * coverage (Knowledge). Returns the Segmentation of each target with a
 * Dumling route, each such target whose Attestation passes, with the Reading
 * and Knowledge that pass, how many targets claim each Segment, and whether
 * every target holds Knowledge that covers its structural aspects.
 */
export function checkTargets(
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
		for (const [m, index] of indices.entries()) {
			const at = `${path}.memberSegmentIndices.${m}`;
			if (!resolvable(index)) {
				issue(
					"Segmentation",
					"Members",
					at,
					"A member is a ResolvableText Segment",
				);
				continue;
			}
			claims[index] = (claims[index] ?? 0) + 1;
			if (m > 0 && index <= (indices[m - 1] ?? -1))
				issue(
					"Segmentation",
					"Members",
					at,
					"Members occur in sentence order, each in its own Segment",
				);
		}
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

/**
 * Checks one target's Attestation, Reading and Knowledge layers. Returns the
 * target when its route is Dumling's and its Attestation passes, carrying
 * its Reading, Knowledge and coverage when they pass, and whether its
 * Knowledge is valid and covers every structural aspect its route requests.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
function checkTargetLayers(
	target: TargetFile,
	segmented: SegmentationTarget | undefined,
	context: {
		path: string;
		language: Dumling.Language | undefined;
		segments: readonly Segment[];
		resolvable: (index: number) => boolean;
		reviewDepth: AnnotationLayer | undefined;
		issue: IssueSink;
	},
): { target?: SpecTarget; knowledge: boolean } {
	const { path, language, segments, resolvable, reviewDepth } = context;
	let failed = false;
	const issue = (
		layer: AnnotationLayer,
		...rest: [SpecCheck, string, string]
	) => {
		if (layer === "Attestation") failed = true;
		context.issue(layer, ...rest);
	};
	const attestationIssue = (check: SpecCheck, at: string, message: string) =>
		issue("Attestation", check, at, message);

	if (target.attestation === undefined) {
		attestationIssue(
			"Attestation",
			`${path}.attestation`,
			"A target holds its Attestation",
		);
		return { knowledge: false };
	}
	const parsed = parseUnit(target.attestation);
	if (!parsed.success) {
		for (const error of parsed.error.issues)
			attestationIssue(
				"Attestation",
				[path, "attestation", ...error.path].join("."),
				error.message,
			);
		return { knowledge: false };
	}
	if (parsed.chain.unitKind !== "Attestation") {
		attestationIssue(
			"Attestation",
			`${path}.attestation`,
			"Expected an Attestation",
		);
		return { knowledge: false };
	}
	const attestation = parsed.chain.value;
	if (!sameValue(attestation, target.attestation))
		attestationIssue(
			"Attestation",
			`${path}.attestation`,
			"Store the Attestation exactly as parseUnit normalizes it",
		);
	const { lemma } = attestation.surface;
	if (language && lemma.language !== language)
		attestationIssue(
			"Attestation",
			`${path}.attestation.surface.language`,
			`A ${language} record holds ${language} Attestations`,
		);
	if (
		lemma.family !== target.route.family ||
		lemma.kind !== target.route.kind
	)
		attestationIssue(
			"Route",
			`${path}.attestation.surface.lemma`,
			`The Attestation's Lemma is ${lemma.family} ${lemma.kind}, not the target's route ${target.route.family} ${target.route.kind}`,
		);
	for (const { check, ...found } of languageAttestationIssues(attestation))
		attestationIssue(
			check,
			`${path}.attestation.${found.path}`,
			found.message,
		);
	for (const found of attestationSyncretismIssues(attestation))
		attestationIssue(
			"Syncretism",
			`${path}.attestation.${found.path}`,
			found.message,
		);

	const indices = target.memberSegmentIndices;
	if (indices.length !== attestation.members.length)
		attestationIssue(
			"Members",
			`${path}.memberSegmentIndices`,
			"Name one Segment per Attestation member",
		);
	for (const [m, member] of attestation.members.entries()) {
		const index = indices[m];
		if (index === undefined || !resolvable(index)) continue;
		const text = segments[index]?.text;
		if (member.attested !== text)
			attestationIssue(
				"Members",
				`${path}.memberSegmentIndices.${m}`,
				`Member ${JSON.stringify(member.attested)} is not Segment ${index} ${JSON.stringify(text)}`,
			);
	}
	if (target.grundform !== undefined) {
		const verdict = checkIfGrundform(attestation.surface);
		// A stated verdict the assessment cannot settle is not checked, so it
		// fails (ADR 0042).
		if (!verdict.success)
			attestationIssue(
				"Grundform",
				`${path}.grundform`,
				`This Surface's Grundform cannot be assessed: ${verdict.error.message}`,
			);
		else if (verdict.value !== target.grundform)
			attestationIssue(
				"Grundform",
				`${path}.grundform`,
				`The assessment finds this Surface ${verdict.value ? "" : "not "}Grundform`,
			);
	}

	const reading = checkReading(target.reading, attestation);
	for (const failure of reading.issues)
		issue("Reading", "Reading", `${path}.${failure.path}`, failure.message);
	if (reading.value)
		for (const found of authoredReadingIssues(reading.value))
			issue(
				"Reading",
				"AuthoredReading",
				`${path}.${found.path}`,
				found.message,
			);
	let knowledge: Dumrel.ReadingKnowledge | undefined;
	if (
		reading.value !== undefined &&
		target.reading?.knowledge !== undefined
	) {
		const checked = checkKnowledge(target.reading.knowledge, reading.value);
		for (const failure of checked.issues)
			issue(
				"Knowledge",
				"Knowledge",
				`${path}.${failure.path}`,
				failure.message,
			);
		if (checked.issues.length === 0) knowledge = checked.knowledge;
	} else if (reviewDepth === "Knowledge")
		issue(
			"Knowledge",
			"Knowledge",
			`${path}.reading.knowledge`,
			"A record reviewed through Knowledge holds each target's Reading Knowledge",
		);
	const authoredCoverage: KnowledgeCoverage | undefined =
		target.reading?.coverage;
	if (
		authoredCoverage !== undefined &&
		target.reading?.knowledge === undefined
	)
		issue(
			"Knowledge",
			"KnowledgeCoverage",
			`${path}.reading.knowledge`,
			"A Reading with coverage holds its Knowledge, {} when it holds no aspect",
		);
	let coverage: KnowledgeCoverage | undefined;
	let complete = false;
	if (knowledge !== undefined && reading.value !== undefined) {
		const covered = knowledgeCoverageIssues(
			reading.value,
			knowledge,
			authoredCoverage,
		);
		for (const found of covered.issues)
			issue(
				"Knowledge",
				"KnowledgeCoverage",
				`${path}.${found.path}`,
				found.message,
			);
		if (covered.uncovered.length > 0 && reviewDepth === "Knowledge")
			issue(
				"Knowledge",
				"KnowledgeCoverage",
				`${path}.reading.coverage`,
				`A record reviewed through Knowledge covers each structural aspect its route requests; uncovered: ${covered.uncovered.join(", ")}`,
			);
		if (covered.issues.length === 0) coverage = authoredCoverage;
		complete =
			covered.issues.length === 0 && covered.uncovered.length === 0;
	}
	if (failed) return { knowledge: false };
	if (!segmented) return { knowledge: complete };
	return {
		target: {
			...segmented,
			attestation,
			...(reading.value === undefined ? {} : { reading: reading.value }),
			...(knowledge === undefined ? {} : { knowledge }),
			...(coverage === undefined ? {} : { coverage }),
			...(target.grundform === undefined
				? {}
				: { grundform: target.grundform }),
		},
		knowledge: complete,
	};
}

/**
 * Builds the target's Reading from its Attestation's Lemma and authored Emoji
 * Description and checks it with Dumling's Reading schema. A target that
 * names none fails the Reading layer. A Foreign Reading is its Lemma alone,
 * so its target names it with no Emoji Description (ADR 0045); Dumling
 * rejects a missing one on any other route.
 */
function checkReading(
	authored: { emojiDescription?: string } | undefined,
	attestation: Dumling.Attestation,
): {
	value?: Dumling.Reading;
	issues: { path: string; message: string }[];
} {
	if (authored === undefined)
		return {
			issues: [
				{ path: "reading", message: "A target names its Reading" },
			],
		};
	const parsed = parseUnit({
		unitKind: "Reading",
		lemma: attestation.surface.lemma,
		...(authored.emojiDescription === undefined
			? {}
			: { emojiDescription: authored.emojiDescription }),
	});
	if (!parsed.success)
		return {
			issues: parsed.error.issues.map((error) => ({
				path: ["reading", ...error.path].join("."),
				message: error.message,
			})),
		};
	if (parsed.chain.unitKind !== "Reading")
		return { issues: [{ path: "reading", message: "Expected a Reading" }] };
	const reading = parsed.chain.value;
	if (
		"emojiDescription" in reading &&
		reading.emojiDescription !== authored.emojiDescription
	)
		return {
			issues: [
				{
					path: "reading.emojiDescription",
					message: `Store the Emoji Description as parseUnit normalizes it: ${JSON.stringify(reading.emojiDescription)}`,
				},
			],
		};
	return { value: reading, issues: [] };
}

/**
 * Checks a target's Reading Knowledge against the Reading that owns it with
 * dumrel's `parseReadingKnowledge`, which rejects an aspect or relation the
 * Reading's route cannot hold (an `endonym` outside PROPN). Where dumrel has
 * a Knowledge Policy for the route, each stored relation must also be one the
 * route requests. The Knowledge is stored as dumrel normalizes it.
 */
function checkKnowledge(
	authored: unknown,
	reading: Dumling.Reading,
): {
	knowledge?: Dumrel.ReadingKnowledge;
	issues: { path: string; message: string }[];
} {
	const at = (path: readonly PropertyKey[]) =>
		["reading", "knowledge", ...path.slice(path[0] === "knowledge" ? 1 : 0)]
			.map(String)
			.join(".");
	const parsed = parseReadingKnowledge({
		source: reading,
		knowledge: authored,
	});
	if (!parsed.success)
		return {
			issues: parsed.error.issues.map((error) => ({
				path: at(error.path),
				message: error.message,
			})),
		};
	const knowledge: Dumrel.ReadingKnowledge = parsed.value;
	const issues: { path: string; message: string }[] = [];
	const { language, family, kind } = reading.lemma;
	const policy = selectKnowledge({ route: routeOf(reading.lemma) });
	const requested = policy.success
		? (policy.value.semanticRelations ?? {})
		: undefined;
	for (const relation of Object.keys(knowledge.semanticRelations ?? {}))
		if (
			requested &&
			relation !== "targetKind" &&
			!Object.hasOwn(requested, relation)
		)
			issues.push({
				path: at(["semanticRelations", relation]),
				message: `A ${language} ${family} ${kind} Reading has no ${relation} relation`,
			});
	if (!sameValue(knowledge, authored))
		issues.push({
			path: at([]),
			message: "Store the Knowledge exactly as dumrel normalizes it",
		});
	return { knowledge, issues };
}
