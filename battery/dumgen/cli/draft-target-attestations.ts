/**
 * Drafts a Dumling Attestation for each priority target-classification case
 * (ADR 0037, #632) by running Grammatical Resolution on the case's expected
 * target: its Family, Kind and members, never the classifier's answer. The
 * priority cases are the demonstrations and the evaluation slice, which holds
 * the participle-boundary and governed-preposition slices. Cases sharing a
 * Sentence and target are drafted once.
 *
 * Paid and opt-in: it calls the live generation and judgment models.
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
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { Effect } from "effect";
import { stableJson } from "promptsmith";
import type { ModelConfiguration } from "promptsmith/evaluation";
import { createOpenAIExecutor } from "promptsmith/openai";
import { createTypeSafeExecutor } from "promptsmith/typesafe";
import {
	demonstrationIds,
	evaluationCaseIds,
	targetCases,
} from "../src/concrete-lang/de/target-classification/cases.js";
import type { DumgenOptions } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { effectiveConfiguration } from "../src/universal/model-configuration.js";
import { judgmentConfiguration } from "../src/universal/trace.js";
import { validateEncounter } from "../src/universal/validation.js";

export type TargetDraft =
	| { attestation: Dumling.Attestation }
	| { failure: string };
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

	const execute = createOpenAIExecutor();
	const judge = createTypeSafeExecutor();
	const options: DumgenOptions = {
		execute: (request) =>
			execute({
				...request,
				configuration: request.configuration as ModelConfiguration,
			}),
		judge: (request, callOptions) => judge(request, callOptions),
		judgmentConfiguration: {
			timeoutMs: Number(values["judgment-timeout"]),
		},
	};
	const dumgen = createDumgen(options);

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
		let failure = "not attempted";
		for (let attempt = 0; attempt < attempts; attempt++) {
			try {
				const encounter = validateEncounter({
					sentence: {
						id,
						language: "de",
						segments: golden.input.segments,
					},
					target: golden.idealOutput,
				});
				const result = await Effect.runPromise(
					Effect.either(
						dumgen.resolveGrammar({
							...encounter,
							contextAvailable: false,
						}),
					),
				);
				if (result._tag === "Left") {
					failure = `${result.left._tag}: ${result.left.message}`;
					continue;
				}
				if ("decision" in result.right) {
					failure = `Decision ${result.right.decision}`;
					continue;
				}
				const parsed = parseUnit(result.right);
				if (
					!parsed.success ||
					parsed.chain.unitKind !== "Attestation"
				) {
					failure = "The Attestation fails strict parseUnit";
					continue;
				}
				return {
					attestation: parsed.chain.value as Dumling.Attestation,
				};
			} catch (error) {
				failure =
					error instanceof Error ? error.message : String(error);
			}
		}
		return { failure };
	}

	const queue = [...groups.values()];
	let done = 0;
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
					configuration: {
						generation: effectiveConfiguration(options),
						judgment: judgmentConfiguration(options),
					},
					drafts: ordered,
				} satisfies TargetDrafts,
				null,
				"\t",
			)}\n`,
		);
	};
	await Promise.all(
		Array.from({ length: concurrency }, async () => {
			for (let ids = queue.shift(); ids; ids = queue.shift()) {
				const result = await draft(ids[0] as string);
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
