import type { AdrIds } from "../check-citations.js";
import { isReviewed } from "../layers.js";
import type { Rule, SpecRecord, SpecSegmentation } from "../types.js";
import {
	type SttsMapping,
	type SttsRow,
	type SttsShowing,
	sttsTags,
} from "./types.js";

/** What the crosswalk is checked against. */
export interface CrosswalkContext {
	/** Every record whose Segmentation passes. */
	segmentations: readonly SpecSegmentation[];
	/** Every record whose Attestation passes, for the `lemma` check. */
	records: readonly SpecRecord[];
	rules: readonly Rule[];
	adrs: AdrIds;
	/** The German routes, as `<Family>/<Kind>`. */
	routes: readonly string[];
}

/** One failed check on one row. */
export interface CrosswalkIssue {
	tag: string;
	message: string;
}

const goldRank = { No: 0, Partial: 1, Yes: 2 } as const;

/** Why a showing record doesn't show its mapping, or nothing when it does. */
function showingIssue(
	mapping: SttsMapping,
	showing: SttsShowing,
	context: CrosswalkContext,
): string | undefined {
	const at = `${showing.record} ${showing.word}`;
	const record = context.segmentations.find(
		(segmentation) => segmentation.id === showing.record,
	);
	if (!record)
		return `No Spec Record ${showing.record} whose Segmentation passes`;
	const indices = record.segments.flatMap((segment, index) =>
		segment.text === showing.word ? [index] : [],
	);
	const index = indices[(showing.nth ?? 1) - 1];
	if (index === undefined)
		return `${showing.record} has no ${showing.nth ? `${showing.nth}. ` : ""}Segment ${showing.word}`;
	const { becomes } = mapping;
	if (becomes.role === "Punctuation")
		return record.segments[index]?.kind === "Punctuation"
			? undefined
			: `${at} is no Punctuation Segment`;
	if (becomes.role === "NoTarget")
		return record.noTarget.some((entry) =>
			entry.memberSegmentIndices.includes(index),
		)
			? undefined
			: `${at} is in no No Target entry`;
	const target = record.targets.find((candidate) =>
		candidate.memberSegmentIndices.includes(index),
	);
	if (!target) return `${at} is in no target`;
	const route = `${target.route.family}/${target.route.kind}`;
	const expected = `${becomes.route.family}/${becomes.route.kind}`;
	if (route !== expected)
		return `${at} is in a ${route} target, not ${expected}`;
	const members = target.memberSegmentIndices.length;
	if (becomes.role === "Target" && !becomes.satellites && members > 1)
		return `${at} is one of ${members} members, not the whole target`;
	if (becomes.role === "Member" && members < 2)
		return `${at} is a target alone, not a member`;
	if (
		becomes.role === "Component" &&
		record.segments[index]?.surface === undefined
	)
		return `${at} is no piece of a fused word`;
	if (showing.lemma !== undefined) {
		const attested = context.records
			.find(({ id }) => id === showing.record)
			?.targets.find(
				(candidate) =>
					candidate.memberSegmentIndices.join() ===
					target.memberSegmentIndices.join(),
			)?.attestation.surface.lemma.canonicalForm;
		if (attested === undefined)
			return `${at}: the record's Attestation fails, so the Lemma can't be checked`;
		if (attested !== showing.lemma)
			return `${at} is in the target of ${attested}, not ${showing.lemma}`;
	}
	return undefined;
}

/** Whether a record reviewed through Attestation shows the mapping. */
function mappingInGold(
	mapping: SttsMapping,
	context: CrosswalkContext,
): boolean {
	return mapping.records.some(
		(showing) =>
			showingIssue(mapping, showing, context) === undefined &&
			context.segmentations.some(
				(record) =>
					record.id === showing.record &&
					isReviewed(record, "Attestation"),
			),
	);
}

/**
 * The gold status the records support: `Yes` when a record reviewed
 * through Attestation shows every mapping, `Partial` when one shows some.
 */
export function sttsGold(
	row: SttsRow,
	context: CrosswalkContext,
): SttsRow["gold"] {
	const shown = row.mappings.filter((mapping) =>
		mappingInGold(mapping, context),
	).length;
	return shown === 0
		? "No"
		: shown === row.mappings.length
			? "Yes"
			: "Partial";
}

/**
 * Checks the crosswalk: one row per STTS tag; Rules, ADRs, routes and
 * records that exist; each record showing the word as the target, member,
 * component, No Target entry or Punctuation Segment its mapping says; a
 * reason for each mapping no record shows and each status short of `Yes`;
 * and no gold status beyond what reviewed records show.
 */
export function checkSttsCrosswalk(
	rows: readonly SttsRow[],
	context: CrosswalkContext,
): CrosswalkIssue[] {
	const issues: CrosswalkIssue[] = [];
	const tags = rows.map((row) => row.tag);
	for (const tag of sttsTags)
		if (!tags.includes(tag)) issues.push({ tag, message: "No row" });
	const ruleIds = new Set(context.rules.map((rule) => rule.id));
	const routes = new Set(context.routes);
	const seen = new Set<string>();
	for (const row of rows) {
		const issue = (message: string) =>
			issues.push({ tag: row.tag, message });
		if (seen.has(row.tag)) issue("Another row has this tag");
		seen.add(row.tag);
		if (row.mappings.length === 0) issue("No mapping");
		for (const rule of row.rules)
			if (!ruleIds.has(rule)) issue(`No Rule ${rule}`);
		for (const adr of row.adrs)
			if (!context.adrs.has(adr)) issue(`No ADR ${adr}`);
		for (const [side, status] of [
			["model", row.model],
			["pipeline", row.pipeline],
		] as const)
			if (status.status !== "Yes" && status.gaps.length === 0)
				issue(`The ${side} status is ${status.status} without a gap`);
		for (const mapping of row.mappings) {
			const { becomes } = mapping;
			if (
				"route" in becomes &&
				!routes.has(`${becomes.route.family}/${becomes.route.kind}`)
			)
				issue(
					`${mapping.use}: no route ${becomes.route.family}/${becomes.route.kind}`,
				);
			if (mapping.records.length === 0 && !mapping.missing)
				issue(`${mapping.use}: no record and no reason`);
			if (mapping.records.length > 0 && mapping.missing)
				issue(`${mapping.use}: records and a missing reason`);
			for (const showing of mapping.records) {
				const message = showingIssue(mapping, showing, context);
				if (message) issue(`${mapping.use}: ${message}`);
			}
		}
		const gold = sttsGold(row, context);
		if (goldRank[row.gold] > goldRank[gold])
			issue(
				`Gold is ${row.gold}, but records reviewed through Attestation show ${gold}`,
			);
	}
	return issues;
}
