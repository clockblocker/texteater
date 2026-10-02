import { isReviewed } from "dumspec";
import type * as Dumspec from "dumspec/types";
import type { AttestedAttestation } from "../../../../src/lib/docs/document-shapes.ts";
import { exampleFor } from "../../../../src/lib/docs/spec-examples.ts";
import {
	asSingleLineSentence,
	hrefForAttestedAttestation,
	withLinkedAttestationSpan,
} from "../attested-attestation";

/** One target of a Spec Record, with the page example that links it. */
export type RecordTarget = Readonly<{
	example: AttestedAttestation;
	record: Dumspec.SpecRecord;
	target: Dumspec.SpecTarget;
}>;

export function recordTargets(
	records: readonly Dumspec.SpecRecord[],
): RecordTarget[] {
	return records.flatMap((record) =>
		record.targets.map((target, index) => ({
			example: exampleFor(record, index),
			record,
			target,
		})),
	);
}

/**
 * A page shows a target's Attestation, so it counts the record as Reviewed
 * when a person has reviewed its Attestation layer.
 */
function reviewLabel(record: Dumspec.SpecRecord): "Reviewed" | "Draft" {
	return isReviewed(record, "Attestation") ? "Reviewed" : "Draft";
}

export function isArchaic(entry: RecordTarget): boolean {
	const features = entry.target.attestation.surface.surfaceFeatures as {
		historicalStatus?: string | null;
	} | null;
	return features?.historicalStatus === "Archaic";
}

/**
 * Page order: Reviewed records before Draft ones, and targets with archaic
 * Surfaces after both, then by record id and target.
 */
export function inPageOrder(entries: readonly RecordTarget[]): RecordTarget[] {
	const rank = (entry: RecordTarget) =>
		(isArchaic(entry) ? 2 : 0) +
		(reviewLabel(entry.record) === "Reviewed" ? 0 : 1);
	return entries.toSorted(
		(left, right) =>
			rank(left) - rank(right) ||
			left.record.id.localeCompare(right.record.id) ||
			left.example.target - right.example.target,
	);
}

function oneLine(text: string): string {
	return text.replace(/\s+/gu, " ").trim();
}

/**
 * One compact list item: the sentence with the target's members linked to its
 * attestation page, the Lemma's Canonical Form, whether its Attestation is
 * reviewed, `Archaic` where it applies, and the record id.
 */
export function renderTargetLine(
	entry: RecordTarget,
	options: { notes: boolean },
): string {
	const lemma = entry.target.attestation.surface.lemma;
	const tags = [
		`\`${lemma.canonicalForm}\``,
		reviewLabel(entry.record),
		...(isArchaic(entry) ? ["Archaic"] : []),
		`\`${entry.record.id}\``,
	];
	const line = `- ${JSON.stringify(withLinkedAttestationSpan(entry.example))} → ${tags.join(" · ")}`;
	const notes = entry.target.notes;
	if (!options.notes || notes === undefined) return line;
	return [
		line,
		...(notes.rationale === undefined
			? []
			: [`  - Rationale: ${oneLine(notes.rationale)}`]),
		...(notes.knownMistakes ?? []).map(
			(mistake) => `  - Known mistake: ${oneLine(mistake)}`,
		),
	].join("\n");
}

/**
 * A record with every target linked by its Lemma, for the records that show
 * a Rule: `"Ich bin im Wald." → [in](…) · [Wald](…)`.
 */
export function renderRecordLine(record: Dumspec.SpecRecord): string {
	const targets = record.targets.map((target, index) => {
		const example = exampleFor(record, index);
		return `[${target.attestation.surface.lemma.canonicalForm} ${target.attestation.surface.lemma.kind}](${hrefForAttestedAttestation(example)})`;
	});
	return `- ${JSON.stringify(asSingleLineSentence(record.sentence))} → ${targets.join(" · ")} · \`${record.id}\``;
}

/** How many distinct records the targets come from, and how many are Draft or Partial. */
export function renderRecordCounts(entries: readonly RecordTarget[]): string {
	const records = [...new Set(entries.map((entry) => entry.record))];
	const draft = records.filter(
		(record) => reviewLabel(record) === "Draft",
	).length;
	const partial = records.filter(
		(record) => record.coverage === "Partial",
	).length;
	const plural = (count: number, word: string) =>
		`${count} ${word}${count === 1 ? "" : "s"}`;
	return `${plural(entries.length, "target")} from ${plural(records.length, "record")}. Draft: ${draft}. Partial coverage: ${partial}.`;
}
