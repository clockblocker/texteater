/**
 * Drafts a Dumling Attestation for each priority target-classification case
 * (ADR 0037, #632) by running Grammatical Resolution on the case's expected
 * target: its Family, Kind and members, never the classifier's answer. The
 * priority cases are the demonstrations and the evaluation slice, which holds
 * the participle-boundary and governed-preposition slices. Cases sharing a
 * Sentence and target are drafted once.
 *
 * Paid and opt-in: it calls the live generation and judgment models, and
 * stops at the first answer that the provider wants payment (HTTP 402).
 *
 *   bun --env-file=<repository>/.env.local cli/draft-target-attestations.ts
 *
 * Drafts land in `evidence/target-attestation-drafts/drafts.json`; a rerun
 * keeps every earlier draft that succeeded and retries the rest. Pass
 * `--redraft` to draft every case again, or `--cases a,b` to draft only those.
 * `codegen/migrate-target-cases.ts` turns the drafts into Spec Records and
 * the review sheet.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { stableJson } from "promptsmith";
import {
	demonstrationIds,
	evaluationCaseIds,
	targetCases,
} from "../src/concrete-lang/de/target-classification/cases.js";
import {
	type AttestationDraft,
	createAttestationDrafter,
	unpaid,
} from "./attestation-drafter.js";

export type TargetDraft = AttestationDraft;
export type TargetDrafts = {
	configuration: { generation: unknown; judgment: unknown };
	drafts: Record<string, TargetDraft>;
};
export const draftsPath = new URL(
	"../evidence/target-attestation-drafts/drafts.json",
	import.meta.url,
);
/** The cases drafted first and reviewed first, in list order. */
export const priorityCaseIds = [
	...new Set([...demonstrationIds, ...evaluationCaseIds]),
];

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
	const concurrency = Number(values.concurrency);
	const attempts = Number(values.attempts);
	const selected = values.cases?.split(",") ?? priorityCaseIds;
	for (const id of selected)
		if (!targetCases[id]) throw Error(`Unknown target case ${id}`);

	const drafter = createAttestationDrafter({
		attempts,
		judgmentTimeoutMs: Number(values["judgment-timeout"]),
	});

	const previous: TargetDrafts | undefined = existsSync(draftsPath)
		? JSON.parse(readFileSync(draftsPath, "utf8"))
		: undefined;
	const drafts: Record<string, TargetDraft> = { ...previous?.drafts };

	/** One draft per Sentence and target; each case it serves shares it. */
	const groups = new Map<string, string[]>();
	for (const id of selected) {
		const golden = targetCases[id];
		if (!golden || "decision" in golden.idealOutput) continue;
		const earlier = drafts[id];
		if (!values.redraft && earlier && "attestation" in earlier) continue;
		const key = stableJson({
			segments: golden.input.segments,
			target: golden.idealOutput,
		});
		groups.set(key, [...(groups.get(key) ?? []), id]);
	}

	async function draft(id: string): Promise<TargetDraft> {
		const golden = targetCases[id];
		if (!golden || "decision" in golden.idealOutput)
			throw Error(`${id} has no target`);
		return drafter.draft(id, golden.input.segments, golden.idealOutput);
	}

	const queue = [...groups.values()];
	let done = 0;
	let stopped = false;
	const save = () => {
		const ordered = Object.fromEntries(
			Object.keys(targetCases)
				.filter((id) => drafts[id])
				.map((id) => [id, drafts[id] as TargetDraft]),
		);
		mkdirSync(new URL(".", draftsPath), { recursive: true });
		writeFileSync(
			draftsPath,
			`${JSON.stringify(
				{
					configuration: drafter.configuration,
					drafts: ordered,
				} satisfies TargetDrafts,
				null,
				"\t",
			)}\n`,
		);
	};
	await Promise.all(
		Array.from({ length: concurrency }, async () => {
			for (
				let ids = queue.shift();
				ids && !stopped;
				ids = queue.shift()
			) {
				const result = await draft(ids[0] as string);
				// Every later call would fail the same way.
				if (unpaid(result)) stopped = true;
				for (const id of ids) drafts[id] = result;
				done++;
				console.error(
					`${done}/${groups.size} ${ids.join(", ")}: ${"failure" in result ? `failed, ${result.failure}` : "drafted"}`,
				);
				if (done % 20 === 0) save();
			}
		}),
	);
	save();
	const failed = selected.filter((id) => {
		const entry = drafts[id];
		return entry && "failure" in entry;
	});
	console.log(
		`Attempted ${groups.size} targets; ${failed.length} of ${selected.length} cases have no draft`,
	);
}

if (import.meta.main)
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	});
