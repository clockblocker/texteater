import { checkIfGrundform, parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { parseReadingKnowledge, selectKnowledge } from "dumrel";
import type * as Dumrel from "dumrel/types";
import { z } from "zod";
import { attestationAdpositionCaseIssues } from "./check-adposition-cases.js";
import { attestationArticleAgreementIssues } from "./check-article-agreement.js";
import type { SpecCheck, SpecIssue } from "./issues.js";
import { recordFileSchema } from "./record-schema.js";
import type {
	LegacyCase,
	ReviewStatus,
	Segment,
	Sources,
	SpecRecord,
	SpecRecordId,
	SpecTarget,
} from "./types.js";

const idPattern = /^(de|en|he)(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)+$/u;
const fileSchema = recordFileSchema({
	attestation: z.unknown(),
	knowledge: z.unknown(),
});

/**
 * A failed record names its status, its imported cases and the targets that
 * name no Reading once its shape parses.
 */
export type RecordCheck =
	| { success: true; record: SpecRecord }
	| {
			success: false;
			issues: SpecIssue[];
			status?: ReviewStatus;
			legacy?: readonly LegacyCase[];
			targetsWithoutReading?: readonly number[];
	  };

/**
 * A Reviewed record of any kind cites at least one Rule; a Draft may cite
 * none. The stale-citation guard checks what a record cites, this that it
 * cites something.
 */
export function uncitedIssue(
	record: SpecRecordId,
	status: ReviewStatus,
	sources: Pick<Sources, "rules"> | undefined,
): SpecIssue | undefined {
	if (status !== "Reviewed" || (sources?.rules.length ?? 0) > 0)
		return undefined;
	return {
		record,
		check: "Uncited",
		path: "sources.rules",
		message: "A Reviewed record cites at least one Rule",
	};
}

/**
 * Runs every check that needs only the record itself: its id, shape, strict
 * Attestations and Readings, the Attestations' cases against the ADP Case
 * Table, their articles against the der and ein cells, Segments, member order, coverage, Grundform and a Reviewed record's
 * Rule citation. A Reviewed target must name its Reading; a Draft target may
 * not yet.
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
	const { sentence, segments, targets, noTarget, coverage, status, legacy } =
		file.data;

	const { parsedTargets, claims, resolvable } = checkTargets(
		{ sentence, segments, targets, status },
		language,
		issue,
	);
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
	const uncited = uncitedIssue(id, status, file.data.sources);
	if (uncited) issues.push(uncited);

	if (issues.length > 0 || !language)
		return {
			success: false,
			issues,
			status,
			...(legacy === undefined ? {} : { legacy }),
			targetsWithoutReading: targetsWithoutReading(targets),
		};
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
			status,
			sources: file.data.sources,
			provenance: file.data.provenance,
			...(legacy === undefined ? {} : { legacy }),
		},
	};
}

/** The indices of the targets that name no Reading. */
export function targetsWithoutReading(
	targets: readonly { reading?: unknown }[],
): number[] {
	return targets.flatMap((target, t) =>
		target.reading === undefined ? [t] : [],
	);
}

type TargetFile = z.infer<typeof fileSchema>["targets"][number];

/**
 * The checks a sentence record and a Breakdown Record share: the Segments
 * spell the sentence, and each target's members, strict Attestation, ADP
 * cases, Reading and Grundform. Returns the parsed targets and how many
 * targets claim each Segment.
 */
export function checkTargets(
	record: {
		sentence: string;
		segments: readonly Segment[];
		targets: readonly TargetFile[];
		status: ReviewStatus;
	},
	language: Dumling.Language | undefined,
	issue: (check: SpecCheck, path: string, message: string) => void,
): {
	parsedTargets: SpecTarget[];
	claims: number[];
	resolvable: (index: number) => boolean;
} {
	const { sentence, segments, targets, status } = record;
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
		for (const found of attestationAdpositionCaseIssues(attestation))
			issue(
				"AdpositionCase",
				`${path}.attestation.${found.path}`,
				found.message,
			);
		for (const found of attestationArticleAgreementIssues(attestation))
			issue(
				"ArticleAgreement",
				`${path}.attestation.${found.path}`,
				found.message,
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

		const reading = checkReading(target.reading, attestation, status);
		for (const failure of reading.issues)
			issue("Reading", `${path}.${failure.path}`, failure.message);

		if (target.grundform !== undefined) {
			const verdict = checkIfGrundform(attestation.surface);
			// A stated verdict Dumling cannot assess is not checked, so it fails
			// (ADR 0042).
			if (!verdict.success)
				issue(
					"Grundform",
					`${path}.grundform`,
					`Dumling cannot assess this Surface's Grundform: ${verdict.error.message}`,
				);
			else if (verdict.value !== target.grundform)
				issue(
					"Grundform",
					`${path}.grundform`,
					`Dumling assesses this Surface as ${verdict.value ? "" : "not "}Grundform`,
				);
		}
		parsedTargets.push({
			attestation,
			memberSegmentIndices: indices,
			...(reading.value === undefined ? {} : { reading: reading.value }),
			...(reading.knowledge === undefined
				? {}
				: { knowledge: reading.knowledge }),
			...(target.grundform === undefined
				? {}
				: { grundform: target.grundform }),
			...(target.notes === undefined ? {} : { notes: target.notes }),
		});
	}
	return { parsedTargets, claims, resolvable };
}

/**
 * Builds the target's Reading from its Attestation's Lemma and authored Emoji
 * Description, checks it with Dumling's Reading schema, and checks its
 * Knowledge against it. A Reviewed target must name one. A Foreign Reading is
 * its Lemma alone, so its target names it with no Emoji Description (ADR
 * 0045); Dumling rejects a missing one on any other route.
 */
function checkReading(
	authored: { emojiDescription?: string; knowledge?: unknown } | undefined,
	attestation: Dumling.Attestation,
	status: ReviewStatus,
): {
	value?: Dumling.Reading;
	knowledge?: Dumrel.ReadingKnowledge;
	issues: { path: string; message: string }[];
} {
	if (authored === undefined)
		return {
			issues:
				status === "Reviewed"
					? [
							{
								path: "reading",
								message: "A Reviewed target names its Reading",
							},
						]
					: [],
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
	if (authored.knowledge === undefined) return { value: reading, issues: [] };
	const knowledge = checkKnowledge(authored.knowledge, reading);
	return { value: reading, ...knowledge };
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
	const policy = selectKnowledge({
		route: {
			language,
			family,
			kind,
		} as Dumrel.KnowledgeSelectionInput["route"],
	});
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

/** Deep equality of JSON values, key order aside. */
export function sameValue(left: unknown, right: unknown): boolean {
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
