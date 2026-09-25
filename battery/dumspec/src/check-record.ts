import { checkIfGrundform, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { z } from "zod";
import type { SpecCheck, SpecIssue } from "./issues.js";
import { recordFileSchema } from "./record-schema.js";
import type { SpecRecord, SpecRecordId, SpecTarget } from "./types.js";

const idPattern = /^(de|en|he)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+$/u;
const fileSchema = recordFileSchema(z.unknown());

export type RecordCheck =
	| { success: true; record: SpecRecord }
	| { success: false; issues: SpecIssue[] };

/**
 * Runs every check that needs only the record itself: its id, shape, strict
 * Attestations, Segments, member order, coverage and Grundform.
 */
export function checkRecord(id: SpecRecordId, input: unknown): RecordCheck {
	const issues: SpecIssue[] = [];
	const issue = (check: SpecCheck, path: string, message: string) =>
		issues.push({ record: id, check, path, message });

	const language = idPattern.exec(id)?.[1] as Dumling.Language | undefined;
	if (!language)
		issue(
			"Id",
			"",
			"A record path is <language>/<kebab-case name>, in ASCII",
		);
	const file = fileSchema.safeParse(input);
	if (!file.success) {
		for (const error of file.error.issues)
			issue("Shape", error.path.join("."), error.message);
		return { success: false, issues };
	}
	const { sentence, segments, targets, noTarget, coverage } = file.data;

	if (segments.map((segment) => segment.text).join("") !== sentence)
		issue(
			"Segments",
			"segments",
			"Segment texts must concatenate to the sentence",
		);
	const resolvable = (index: number) =>
		segments[index]?.kind === "ResolvableText";
	const claims = segments.map(() => 0);

	const parsedTargets: SpecTarget[] = [];
	for (const [t, target] of targets.entries()) {
		const path = `targets.${t}`;
		const indices = target.memberSegmentIndices;
		for (const [m, index] of indices.entries()) {
			const at = `${path}.memberSegmentIndices.${m}`;
			if (!resolvable(index)) {
				issue("Members", at, "A member is a ResolvableText Segment");
				continue;
			}
			claims[index] = (claims[index] ?? 0) + 1;
			if (m > 0 && index <= (indices[m - 1] ?? -1))
				issue(
					"Members",
					at,
					"Members occur in sentence order, each in its own Segment",
				);
		}

		const parsed = parseUnit(target.attestation);
		if (!parsed.success) {
			for (const error of parsed.error.issues)
				issue(
					"Attestation",
					[path, "attestation", ...error.path].join("."),
					error.message,
				);
			continue;
		}
		if (parsed.chain.unitKind !== "Attestation") {
			issue(
				"Attestation",
				`${path}.attestation`,
				"Expected an Attestation",
			);
			continue;
		}
		const attestation = parsed.chain.value;
		if (!sameValue(attestation, target.attestation))
			issue(
				"Attestation",
				`${path}.attestation`,
				"Store the Attestation exactly as parseUnit normalizes it",
			);
		if (language && attestation.surface.language !== language)
			issue(
				"Attestation",
				`${path}.attestation.surface.language`,
				`A ${language} record holds ${language} Attestations`,
			);

		if (indices.length !== attestation.members.length)
			issue(
				"Members",
				`${path}.memberSegmentIndices`,
				"Name one Segment per Attestation member",
			);
		for (const [m, member] of attestation.members.entries()) {
			const index = indices[m];
			if (index === undefined || !resolvable(index)) continue;
			const text = segments[index]?.text;
			if (member.attested !== text)
				issue(
					"Members",
					`${path}.memberSegmentIndices.${m}`,
					`Member ${JSON.stringify(member.attested)} is not Segment ${index} ${JSON.stringify(text)}`,
				);
		}

		if (target.grundform !== undefined) {
			const verdict = checkIfGrundform(attestation.surface);
			if (verdict.success && verdict.value !== target.grundform)
				issue(
					"Grundform",
					`${path}.grundform`,
					`Dumling assesses this Surface as ${verdict.value ? "" : "not "}Grundform`,
				);
		}
		parsedTargets.push({
			attestation,
			memberSegmentIndices: indices,
			...(target.grundform === undefined
				? {}
				: { grundform: target.grundform }),
			...(target.notes === undefined ? {} : { notes: target.notes }),
		});
	}

	for (const [n, entry] of noTarget.entries()) {
		if (!resolvable(entry.segment)) {
			issue(
				"Coverage",
				`noTarget.${n}.segment`,
				"No Target names a ResolvableText Segment",
			);
			continue;
		}
		claims[entry.segment] = (claims[entry.segment] ?? 0) + 1;
	}
	for (const [index, count] of claims.entries()) {
		if (count > 1)
			issue(
				"Coverage",
				`segments.${index}`,
				"A Segment belongs to at most one target or No Target entry",
			);
		else if (count === 0 && coverage === "Full" && resolvable(index))
			issue(
				"Coverage",
				`segments.${index}`,
				`Full coverage leaves ${JSON.stringify(segments[index]?.text)} in no target or No Target entry`,
			);
	}
	if (targets.length === 0 && noTarget.length === 0)
		issue(
			"Coverage",
			"targets",
			"A record has a target or No Target entry",
		);

	if (issues.length > 0 || !language) return { success: false, issues };
	return {
		success: true,
		record: {
			id,
			language,
			sentence,
			segments,
			targets: parsedTargets,
			noTarget,
			coverage,
			status: file.data.status,
			sources: file.data.sources,
			provenance: file.data.provenance,
		},
	};
}

function sameValue(left: unknown, right: unknown): boolean {
	if (Object.is(left, right)) return true;
	if (Array.isArray(left))
		return (
			Array.isArray(right) &&
			left.length === right.length &&
			left.every((item, index) => sameValue(item, right[index]))
		);
	if (
		left === null ||
		right === null ||
		typeof left !== "object" ||
		typeof right !== "object" ||
		Array.isArray(right)
	)
		return false;
	const leftKeys = Object.keys(left);
	return (
		leftKeys.length === Object.keys(right).length &&
		leftKeys.every(
			(key) =>
				Object.hasOwn(right, key) &&
				sameValue(
					(left as Record<string, unknown>)[key],
					(right as Record<string, unknown>)[key],
				),
		)
	);
}
