/**
 * The 🪞 marker checks (ADR 0052). Readings of one Lemma are told apart by
 * their Emoji Description alone, so a Reading whose lexical reflexive is
 * required starts with 🪞, the emoji of the reflexivity unit `sich`:
 * `fürchten` 😨 and 🪞😨. Every accumulated Valency Pattern of a 🪞 Reading
 * holds its Reflexive complement; a non-🪞 Reading may hold a Reflexive in
 * some or all encountered patterns (`(sich) ausruhen`) without carrying 🪞.
 */
import { lemmaIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { allowedComplementKinds } from "dumrel";
import type * as Dumrel from "dumrel/types";
import type {
	KnowledgeCoverage,
	SpecRecordId,
	SpecTarget,
} from "./corpus-types.js";
import { reflexiveMarker as marker } from "./inventories/de/drill-down.js";
import type { SpecIssue } from "./issues.js";

type Located = { readonly path: string; readonly message: string };

const patternHasReflexive = (pattern: Dumrel.ValencyPattern) =>
	pattern.some(({ kind }) => kind === "Reflexive");

const emojiOf = (reading: Dumling.Reading) =>
	"emojiDescription" in reading ? reading.emojiDescription : undefined;

/**
 * Where a Reading's 🪞 disagrees with its accumulated patterns: a 🪞 Reading
 * holds a Reflexive complement in every stored pattern, and cannot be
 * reviewed empty. Only a route that takes a Reflexive is checked, so PRON
 * `sich` 🪞 is no concern.
 */
export function reflexiveMarkerIssues(
	reading: Dumling.Reading,
	knowledge: Dumrel.ReadingKnowledge,
	coverage: KnowledgeCoverage | undefined,
): Located[] {
	if (!allowedComplementKinds(reading.lemma).includes("Reflexive")) return [];
	const emoji = emojiOf(reading);
	if (emoji === undefined || !emoji.startsWith(marker)) return [];
	const patterns = knowledge.valency;
	if (patterns === undefined) {
		return coverage?.valency === "ReviewedEmpty"
			? [
					{
						path: "reading.emojiDescription",
						message: `Only a Reading with a Required Reflexive holds ${marker}`,
					},
				]
			: [];
	}
	if (!patterns.every(patternHasReflexive))
		return [
			{
				path: "reading.emojiDescription",
				message: `Every Valency Pattern of a ${marker} Reading holds a Reflexive complement`,
			},
		];
	return [];
}

/** A loaded record whose targets may carry Knowledge. */
type RecordWithTargets = {
	readonly id: SpecRecordId;
	readonly targets: readonly SpecTarget[];
};

/**
 * Where a Lemma has a non-🪞 Reading whose patterns include a Reflexive beside
 * a 🪞 Reading whose other emoji are the same: the two would be one Reading
 * (ADR 0052). Returns an issue at each such non-🪞 Reading's target.
 */
export function reflexiveTwinIssues(
	records: readonly RecordWithTargets[],
): SpecIssue[] {
	const marked = new Map<string, Set<string>>();
	const optional: {
		readonly lemma: string;
		readonly emoji: string;
		readonly record: SpecRecordId;
		readonly target: number;
	}[] = [];
	for (const record of records)
		for (const [
			target,
			{ reading, knowledge },
		] of record.targets.entries()) {
			const emoji = reading && emojiOf(reading);
			if (!reading || emoji === undefined || !knowledge) continue;
			const lemma = lemmaIdentityKey(reading.lemma);
			const patterns = knowledge.valency ?? [];
			if (
				emoji.startsWith(marker) &&
				patterns.length > 0 &&
				patterns.every(patternHasReflexive)
			)
				marked.set(
					lemma,
					(marked.get(lemma) ?? new Set()).add(
						emoji.slice(marker.length),
					),
				);
			else if (
				!emoji.startsWith(marker) &&
				patterns.some(patternHasReflexive)
			)
				optional.push({ lemma, emoji, record: record.id, target });
		}
	return optional
		.filter(({ lemma, emoji }) => marked.get(lemma)?.has(emoji))
		.map(({ record, target, emoji }) => ({
			record,
			check: "ReflexiveMarker",
			layer: "Knowledge",
			path: `targets.${target}.reading.emojiDescription`,
			message: `This Reading's reflexive pattern shares its emoji ${emoji} with a ${marker} Reading of its Lemma; they are one Reading`,
		}));
}
