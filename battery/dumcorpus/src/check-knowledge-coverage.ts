import { routeOf } from "dumling";
import type * as Dumling from "dumling/types";
import { selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { isAuthoredReading } from "./check-authored-readings.js";
import type { KnowledgeCoverage } from "./corpus-types.js";

/**
 * The structural aspects: the Knowledge `knowledge.produce` is scored on
 * against gold (#883). A record reviewed through Knowledge covers each one
 * its route's Knowledge Policy requests, every requested semantic relation
 * included. The text aspects get a spot-check instead, and the
 * morphological tree belongs to the deferred `segment.inMorphemes`.
 */
const structuralAspects = [
	"plural",
	"valency",
	"participleSource",
	"conjugationClass",
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

const entriesOf = (value: unknown): Entries =>
	value !== null && typeof value === "object"
		? Object.fromEntries(Object.entries(value))
		: {};

/** A relation counts as held only with a claim; other aspects when present. */
function holds(aspect: string, value: unknown): boolean {
	if (value === undefined) return false;
	return (
		aspect !== "semanticRelations" ||
		(Array.isArray(value) && value.length > 0)
	);
}

/**
 * Checks a target's coverage against its Reading Knowledge and its route's
 * Knowledge Policy (#884). Each covered aspect is one the policy requests.
 * Authored means the Knowledge holds the aspect, a relation with at least
 * one claim; ReviewedEmpty means it holds none; and every aspect the
 * Knowledge holds is Authored. Returns the issues and the structural aspects
 * left uncovered. A Reading the Authored Inventory holds has its Knowledge
 * reviewed there (ADR 0021), so it leaves none uncovered.
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
export function knowledgeCoverageIssues(
	reading: Dumling.Reading,
	knowledge: Dumrel.ReadingKnowledge,
	coverage: KnowledgeCoverage | undefined,
): { issues: KnowledgeCoverageIssue[]; uncovered: string[] } {
	const { language, family, kind } = reading.lemma;
	const policy = selectKnowledge({ route: routeOf(reading.lemma) });
	const mask: Entries | undefined = policy.success ? policy.value : undefined;
	const stored: Entries = knowledge;
	const covered = entriesOf(coverage);
	const issues: KnowledgeCoverageIssue[] = [];
	const issue = (at: readonly string[], message: string) =>
		issues.push({ path: ["reading", ...at].join("."), message });
	const route = `${language} ${family} ${kind}`;

	for (const [aspect, entry] of Object.entries(covered)) {
		const leaves: [string | undefined, unknown][] = bucketAspects.has(
			aspect,
		)
			? Object.entries(entriesOf(entry))
			: [[undefined, entry]];
		for (const [leaf, status] of leaves) {
			const name = leaf === undefined ? aspect : `${aspect}.${leaf}`;
			const at = [
				"coverage",
				aspect,
				...(leaf === undefined ? [] : [leaf]),
			];
			const requested =
				mask === undefined ||
				(leaf === undefined
					? Object.hasOwn(mask, aspect)
					: Object.hasOwn(entriesOf(mask[aspect]), leaf));
			if (!requested)
				issue(
					at,
					`A ${route} Reading's Knowledge Policy requests no ${name}`,
				);
			const value =
				leaf === undefined
					? stored[aspect]
					: entriesOf(stored[aspect])[leaf];
			if (status === "Authored" && !holds(aspect, value))
				issue(at, `${name} is Authored, but the Knowledge holds none`);
			else if (status === "ReviewedEmpty" && value !== undefined)
				issue(
					at,
					`${name} is ReviewedEmpty, but the Knowledge holds it; mark it Authored or remove it`,
				);
		}
	}

	for (const [aspect, value] of Object.entries(stored)) {
		const leaves = bucketAspects.has(aspect)
			? Object.keys(entriesOf(value)).filter(
					(leaf) => leaf !== "targetKind",
				)
			: [undefined];
		for (const leaf of leaves) {
			const status =
				leaf === undefined
					? covered[aspect]
					: entriesOf(covered[aspect])[leaf];
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

	const uncovered: string[] = [];
	if (mask !== undefined && !isAuthoredReading(reading))
		for (const aspect of structuralAspects) {
			if (!Object.hasOwn(mask, aspect)) continue;
			if (aspect !== "semanticRelations") {
				if (covered[aspect] === undefined) uncovered.push(aspect);
				continue;
			}
			for (const leaf of Object.keys(entriesOf(mask[aspect])))
				if (entriesOf(covered[aspect])[leaf] === undefined)
					uncovered.push(`${aspect}.${leaf}`);
		}
	return { issues, uncovered };
}
