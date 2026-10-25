/**
 * The 🪞 marker checks (ADR 0052). Readings of one Lemma are told apart by
 * their Emoji Description alone, so a Reading whose Valency Frame has a
 * Required Reflexive Slot starts with 🪞, the emoji of the reflexivity unit
 * `sich`: `fürchten` 😨 and 🪞😨. An Optional Reflexive Slot (`(sich)
 * ausruhen`) takes no marker.
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

/** The status of the frame's Reflexive Slot, if it has one. */
function reflexiveStatus(
	valency: readonly Dumrel.ValencySlot[] | undefined,
): Dumrel.ValencySlotStatus | undefined {
	return valency?.find(({ complements }) =>
		complements.some(({ kind }) => kind === "Reflexive"),
	)?.status;
}

const emojiOf = (reading: Dumling.Reading) =>
	"emojiDescription" in reading ? reading.emojiDescription : undefined;

/**
 * Where a Reading's 🪞 disagrees with its frame: 🪞 comes first exactly when
 * the frame has a Required Reflexive Slot. Only a route that takes a
 * Reflexive is read, so PRON `sich` 🪞 is no concern. A Reading whose
 * Knowledge holds no frame is read only once its valency is reviewed empty.
 */
export function reflexiveMarkerIssues(
	reading: Dumling.Reading,
	knowledge: Dumrel.ReadingKnowledge,
	coverage: KnowledgeCoverage | undefined,
): Located[] {
	if (!allowedComplementKinds(reading.lemma).includes("Reflexive")) return [];
	const emoji = emojiOf(reading);
	if (emoji === undefined) return [];
	const required = reflexiveStatus(knowledge.valency) === "Required";
	const marked = emoji.startsWith(marker);
	if (required && !marked)
		return [
			{
				path: "reading.emojiDescription",
				message: `A Reading with a Required Reflexive Slot starts its Emoji Description with ${marker}`,
			},
		];
	if (
		marked &&
		!required &&
		(knowledge.valency !== undefined ||
			coverage?.valency === "ReviewedEmpty")
	)
		return [
			{
				path: "reading.emojiDescription",
				message: `Only a Reading with a Required Reflexive Slot starts its Emoji Description with ${marker}`,
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
 * Where a Lemma has a Reading with an Optional Reflexive Slot beside a 🪞
 * Reading whose other emoji are the same: the two would be one Reading
 * (ADR 0052). Returns an issue at each such Optional Reading's target.
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
			const status = reflexiveStatus(knowledge.valency);
			if (status === "Required" && emoji.startsWith(marker))
				marked.set(
					lemma,
					(marked.get(lemma) ?? new Set()).add(
						emoji.slice(marker.length),
					),
				);
			else if (status === "Optional")
				optional.push({ lemma, emoji, record: record.id, target });
		}
	return optional
		.filter(({ lemma, emoji }) => marked.get(lemma)?.has(emoji))
		.map(({ record, target, emoji }) => ({
			record,
			check: "ReflexiveMarker",
			layer: "Knowledge",
			path: `targets.${target}.reading.emojiDescription`,
			message: `This Reading's Optional Reflexive Slot shares its emoji ${emoji} with a ${marker} Reading of its Lemma; they are one Reading`,
		}));
}
