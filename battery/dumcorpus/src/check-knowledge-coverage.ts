import { routeOf } from "dumling";
import type * as Dumling from "dumling/types";
import { paradigmDimensions, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { isAuthoredReading } from "./check-authored-readings.js";
import type { KnowledgeCoverage, ReadingParadigm } from "./corpus-types.js";

/**
 * The structural aspects: the Knowledge `knowledge.produce` is scored on
 * against gold (#883). A record reviewed through Knowledge covers each one
 * its route's Knowledge Policy requests, every requested semantic relation
 * included. The text aspects get a spot-check instead.
 */
const structuralAspects = [
	"valency",
	"source",
	"locutionType",
	"sayingType",
	"formulaRole",
	"semanticRelations",
] as const;

/** The aspects covered per translation language and per semantic relation. */
const bucketAspects = new Set(["translations", "semanticRelations"]);

/** One failed coverage check, at a path inside the checked target. */
export type KnowledgeCoverageIssue = {
	readonly path: string;
	readonly message: string;
};

type Entries = Readonly<Record<string, unknown>>;
type IssueRecorder = (at: readonly string[], message: string) => void;

const emptyRecord: Entries = {};

function isRecord(value: unknown): value is Entries {
	return value !== null && typeof value === "object";
}

function recordOf(value: unknown): Entries {
	return isRecord(value) ? value : emptyRecord;
}

function readOwn(record: Entries, key: string): unknown {
	return Object.hasOwn(record, key) ? record[key] : undefined;
}

/** A relation counts as held only with a claim; other aspects when present. */
function holds(aspect: string, value: unknown): boolean {
	if (value === undefined) return false;
	return (
		aspect !== "semanticRelations" ||
		(Array.isArray(value) && value.length > 0)
	);
}

function checkCoveredLeaf(
	aspect: string,
	leaf: string | undefined,
	status: unknown,
	stored: Entries,
	mask: Entries | undefined,
	route: string,
	issue: IssueRecorder,
): void {
	const name = leaf === undefined ? aspect : `${aspect}.${leaf}`;
	const at = ["coverage", aspect, ...(leaf === undefined ? [] : [leaf])];
	const requested =
		mask === undefined ||
		(leaf === undefined
			? Object.hasOwn(mask, aspect)
			: Object.hasOwn(recordOf(readOwn(mask, aspect)), leaf));
	if (!requested)
		issue(at, `A ${route} Reading's Knowledge Policy requests no ${name}`);
	const value =
		leaf === undefined
			? readOwn(stored, aspect)
			: readOwn(recordOf(readOwn(stored, aspect)), leaf);
	if (status === "Authored" && !holds(aspect, value))
		issue(at, `${name} is Authored, but the Knowledge holds none`);
	else if (status === "ReviewedEmpty" && value !== undefined)
		issue(
			at,
			`${name} is ReviewedEmpty, but the Knowledge holds it; mark it Authored or remove it`,
		);
}

function checkCoveredAspects(
	covered: Entries,
	stored: Entries,
	mask: Entries | undefined,
	route: string,
	issue: IssueRecorder,
): void {
	for (const [aspect, entry] of Object.entries(covered)) {
		if (aspect === "paradigm") continue;
		const leaves: [string | undefined, unknown][] = bucketAspects.has(
			aspect,
		)
			? Object.entries(recordOf(entry))
			: [[undefined, entry]];
		for (const [leaf, status] of leaves)
			checkCoveredLeaf(aspect, leaf, status, stored, mask, route, issue);
	}
}

function checkStoredAspects(
	stored: Entries,
	covered: Entries,
	issue: IssueRecorder,
): void {
	for (const [aspect, value] of Object.entries(stored)) {
		const leaves = bucketAspects.has(aspect)
			? Object.keys(recordOf(value)).filter(
					(leaf) => leaf !== "targetKind",
				)
			: [undefined];
		for (const leaf of leaves) {
			const status =
				leaf === undefined
					? readOwn(covered, aspect)
					: readOwn(recordOf(readOwn(covered, aspect)), leaf);
			if (status === undefined)
				issue(
					[
						"knowledge",
						aspect,
						...(leaf === undefined ? [] : [leaf]),
					],
					`Mark the stored ${leaf === undefined ? aspect : `${aspect}.${leaf}`} Authored in reading.coverage`,
				);
		}
	}
}

function checkParadigmCoverage(
	dimensions: readonly string[],
	coveredDimensions: Entries,
	paradigm: ReadingParadigm | undefined,
	route: string,
	issue: IssueRecorder,
): void {
	const held: Entries = paradigm ?? emptyRecord;
	if (paradigm !== undefined) {
		for (const [dimension, status] of Object.entries(coveredDimensions)) {
			const at = ["coverage", "paradigm", dimension];
			if (!dimensions.includes(dimension))
				issue(
					at,
					`A ${route} Lemma's Paradigm Policy names no ${dimension} dimension`,
				);
			const heldValue = readOwn(held, dimension);
			if (status === "Authored" && heldValue === undefined)
				issue(
					at,
					`paradigm.${dimension} is Authored, but the Reading licenses none`,
				);
			else if (status === "ReviewedEmpty" && heldValue !== undefined)
				issue(
					at,
					`paradigm.${dimension} is ReviewedEmpty, but the Reading licenses forms; mark it Authored or remove it`,
				);
		}
	}
	for (const dimension of Object.keys(held))
		if (readOwn(coveredDimensions, dimension) === undefined)
			issue(
				["paradigm", dimension],
				`Mark the stored paradigm.${dimension} Authored in reading.coverage.paradigm`,
			);
}

function collectUncovered(
	dimensions: readonly string[],
	covered: Entries,
	coveredDimensions: Entries,
	mask: Entries | undefined,
	authored: boolean,
): string[] {
	if (authored) return [];
	const uncovered: string[] = [];
	for (const dimension of dimensions)
		if (readOwn(coveredDimensions, dimension) === undefined)
			uncovered.push(`paradigm.${dimension}`);
	if (mask === undefined) return uncovered;
	for (const aspect of structuralAspects) {
		if (!Object.hasOwn(mask, aspect)) continue;
		if (aspect !== "semanticRelations") {
			if (readOwn(covered, aspect) === undefined) uncovered.push(aspect);
			continue;
		}
		const coveredRelations = recordOf(readOwn(covered, aspect));
		for (const leaf of Object.keys(recordOf(readOwn(mask, aspect))))
			if (readOwn(coveredRelations, leaf) === undefined)
				uncovered.push(`${aspect}.${leaf}`);
	}
	return uncovered;
}

/**
 * Checks a target's coverage against its Reading Knowledge, what it licenses
 * in its Lemma's Paradigm (undefined when those forms failed their own
 * check), and its route's Knowledge and Paradigm Policies (#884, Dumcorpus
 * ADR 0002). Each covered aspect is one the policy requests.
 * Authored means the Knowledge holds the aspect, a relation with at least
 * one claim; ReviewedEmpty means it holds none; and every aspect the
 * Knowledge holds is Authored. Returns the issues and the structural aspects
 * left uncovered. A Reading the Authored Inventory holds has its Knowledge
 * reviewed there (ADR 0021), so it leaves none uncovered.
 */
export function knowledgeCoverageIssues(
	reading: Dumling.Reading,
	knowledge: Dumrel.ReadingKnowledge,
	coverage: KnowledgeCoverage | undefined,
	paradigm: ReadingParadigm | undefined,
	policy = selectKnowledge({ route: routeOf(reading.lemma) }),
): { issues: KnowledgeCoverageIssue[]; uncovered: string[] } {
	const { language, family, kind } = reading.lemma;
	const mask: Entries | undefined = policy.success ? policy.value : undefined;
	const stored: Entries = knowledge;
	const covered = recordOf(coverage);
	const issues: KnowledgeCoverageIssue[] = [];
	const issue: IssueRecorder = (at, message) =>
		issues.push({ path: ["reading", ...at].join("."), message });
	const route = `${language} ${family} ${kind}`;

	checkCoveredAspects(covered, stored, mask, route, issue);
	checkStoredAspects(stored, covered, issue);

	const dimensions = paradigmDimensions(reading.lemma);
	const coveredDimensions = recordOf(readOwn(covered, "paradigm"));
	checkParadigmCoverage(
		dimensions,
		coveredDimensions,
		paradigm,
		route,
		issue,
	);

	const authored = isAuthoredReading(reading);
	const uncovered = collectUncovered(
		dimensions,
		covered,
		coveredDimensions,
		mask,
		authored,
	);
	return { issues, uncovered };
}
