/**
 * Drafts a Dumling Attestation for each expected target of the
 * sentence-analysis cases a Full Spec Record could serve (ADR 0037, #634),
 * by running Grammatical Resolution on the target's Kind and members. A case
 * qualifies when its Lexeme layer covers every ResolvableText Segment and
 * its Phraseme layer is empty, and no Reviewed record holds its Sentence. A
 * target a Draft record already holds is not drafted again.
 *
 * Paid and opt-in: it calls the live generation and judgment models, and
 * stops at the first answer that the provider wants payment (HTTP 402).
 *
 *   bun --env-file=<repository>/.env.local cli/draft-sentence-attestations.ts
 *
 * Drafts land in `evidence/sentence-attestation-drafts/drafts.json`, keyed
 * by case id and the first member offset of each target; a rerun keeps
 * every earlier draft that succeeded and retries the rest. Pass `--redraft`
 * to draft every target again, or `--cases a,b` to draft only those cases.
 * `codegen/migrate-sentence-cases.ts` turns the drafts into Spec Records and
 * the review sheet.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { loadSpecRecords } from "dumspec";
import type * as Dumspec from "dumspec/types";
import { stableJson } from "promptsmith";
import { segmentOffsets } from "../codegen/project-sentence-cases.js";
import sourceData from "../src/concrete-lang/de/sentence-analysis/source-data.json";
import type { Segment } from "../src/types.js";
import {
	type AttestationDraft,
	createAttestationDrafter,
	type ExpectedTarget,
	unpaid,
} from "./attestation-drafter.js";

export type SentenceGolden = {
	input: { segments: Segment[] };
	idealOutput: {
		targets?: {
			kind: string;
			members: { offset: number; role?: string }[];
			identity?: string;
		}[];
		phrasemes?: unknown[];
		slots?: Record<string, unknown>[];
	};
	explanation?: string;
};
export type SentenceDrafts = {
	configuration: { generation: unknown; judgment: unknown };
	/** Per case id, the draft of each target keyed by its first member offset. */
	drafts: Record<string, Record<string, AttestationDraft>>;
};

export const sentenceGoldens = sourceData.cases as unknown as Readonly<
	Record<string, SentenceGolden>
>;
export const sentenceDraftsPath = new URL(
	"../evidence/sentence-attestation-drafts/drafts.json",
	import.meta.url,
);

/** One expected target of a case, as Grammatical Resolution takes it. */
export type ExpectedSentenceTarget = {
	/** The target's first member offset, which keys its draft. */
	offset: number;
	target: ExpectedTarget;
};

/**
 * The case's Lexeme layer as targets over Segment indices, when a Full
 * record could reproduce the case: every ResolvableText Segment in exactly
 * one target and an empty Phraseme layer. Otherwise why it cannot.
 */
export function fullRecordTargets(
	golden: SentenceGolden,
): { targets: ExpectedSentenceTarget[] } | { reason: string } {
	const { targets, phrasemes } = golden.idealOutput;
	if (!targets) return { reason: "scores no Lexeme layer" };
	if (!phrasemes) return { reason: "leaves the Phraseme layer unscored" };
	if (phrasemes.length > 0)
		return {
			reason: "has a Phraseme, whose words a Full record cannot also hold as Lexeme targets",
		};
	const segments = golden.input.segments;
	const indexAt = new Map(
		segmentOffsets(segments).map((offset, index) => [offset, index]),
	);
	const claims = segments.map(() => 0);
	const expected: ExpectedSentenceTarget[] = [];
	for (const target of targets) {
		const indices = target.members.map(({ offset }) => indexAt.get(offset));
		if (
			indices.some(
				(index) =>
					index === undefined ||
					segments[index]?.kind !== "ResolvableText",
			)
		)
			return {
				reason: `a member of ${target.kind} is no ResolvableText Segment`,
			};
		for (const index of indices as number[])
			claims[index] = (claims[index] ?? 0) + 1;
		expected.push({
			offset: target.members[0]?.offset ?? 0,
			target: {
				family: "Lexeme",
				kind: target.kind,
				memberSegmentIndices: indices as number[],
			},
		});
	}
	const uncovered = segments.flatMap((segment, index) =>
		segment.kind === "ResolvableText" && claims[index] !== 1
			? [segment.text]
			: [],
	);
	if (uncovered.length > 0)
		return {
			reason: `puts ${uncovered.join(", ")} in no Lexeme target, or in several`,
		};
	return { targets: expected };
}

const plainSegments = (segments: readonly { kind: string; text: string }[]) =>
	stableJson(segments.map(({ kind, text }) => ({ kind, text })));

/** The Draft or Reviewed records of the case's Sentence, Segment for Segment. */
export function recordsOfSentence(
	records: readonly Dumspec.SpecRecord[],
	golden: SentenceGolden,
): Dumspec.SpecRecord[] {
	const segments = plainSegments(golden.input.segments);
	const sentence = golden.input.segments.map(({ text }) => text).join("");
	return records.filter(
		(record) =>
			record.sentence === sentence &&
			(record.status === "Reviewed" ||
				plainSegments(record.segments) === segments),
	);
}

/** Whether a record target is the expected target: same route and members. */
export function holds(
	target: Dumspec.SpecTarget,
	expected: ExpectedTarget,
): boolean {
	const lemma = target.attestation.surface.lemma;
	return (
		lemma.family === expected.family &&
		lemma.kind === expected.kind &&
		stableJson(target.memberSegmentIndices) ===
			stableJson(expected.memberSegmentIndices)
	);
}

async function main() {
	const { values } = parseArgs({
		options: {
			cases: { type: "string" },
			concurrency: { type: "string", default: "6" },
			attempts: { type: "string", default: "3" },
			"judgment-timeout": { type: "string", default: "30000" },
			redraft: { type: "boolean" },
		},
	});
	const selected = values.cases?.split(",") ?? Object.keys(sentenceGoldens);
	for (const id of selected)
		if (!sentenceGoldens[id]) throw Error(`Unknown sentence case ${id}`);

	const previous: SentenceDrafts | undefined = existsSync(sentenceDraftsPath)
		? JSON.parse(readFileSync(sentenceDraftsPath, "utf8"))
		: undefined;
	const drafts: SentenceDrafts["drafts"] = structuredClone(
		previous?.drafts ?? {},
	);
	const records = loadSpecRecords();
	const queue: { id: string; expected: ExpectedSentenceTarget }[] = [];
	for (const id of selected) {
		const golden = sentenceGoldens[id] as SentenceGolden;
		const full = fullRecordTargets(golden);
		if ("reason" in full) continue;
		const existing = recordsOfSentence(records, golden);
		if (existing.some((record) => record.status === "Reviewed")) continue;
		for (const expected of full.targets) {
			if (
				existing.some((record) =>
					record.targets.some((target) =>
						holds(target, expected.target),
					),
				)
			)
				continue;
			const earlier = drafts[id]?.[expected.offset];
			if (!values.redraft && earlier && "attestation" in earlier)
				continue;
			queue.push({ id, expected });
		}
	}

	const drafter = createAttestationDrafter({
		attempts: Number(values.attempts),
		judgmentTimeoutMs: Number(values["judgment-timeout"]),
	});
	const save = () => {
		const ordered = Object.fromEntries(
			Object.keys(sentenceGoldens)
				.filter((id) => drafts[id])
				.map((id) => [id, drafts[id] ?? {}]),
		);
		mkdirSync(new URL(".", sentenceDraftsPath), { recursive: true });
		writeFileSync(
			sentenceDraftsPath,
			`${JSON.stringify(
				{
					configuration: drafter.configuration,
					drafts: ordered,
				} satisfies SentenceDrafts,
				null,
				"\t",
			)}\n`,
		);
	};
	const total = queue.length;
	let done = 0;
	let stopped = false;
	await Promise.all(
		Array.from({ length: Number(values.concurrency) }, async () => {
			for (
				let item = queue.shift();
				item && !stopped;
				item = queue.shift()
			) {
				const golden = sentenceGoldens[item.id] as SentenceGolden;
				const result = await drafter.draft(
					item.id,
					golden.input.segments,
					item.expected.target,
				);
				// Every later call would fail the same way.
				if (unpaid(result)) stopped = true;
				drafts[item.id] = {
					...drafts[item.id],
					[item.expected.offset]: result,
				};
				done++;
				console.error(
					`${done}/${total} ${item.id}@${item.expected.offset}: ${"failure" in result ? `failed, ${result.failure}` : "drafted"}`,
				);
				if (done % 20 === 0) save();
			}
		}),
	);
	save();
	console.log(
		`Attempted ${done} of ${total} targets${stopped ? "; stopped: the provider wants payment" : ""}`,
	);
}

if (import.meta.main)
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
