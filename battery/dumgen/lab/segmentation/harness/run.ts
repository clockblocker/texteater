/**
 * Runs one arm over a frozen case subset with repetitions and stores every
 * repetition's outputs (one per assembly policy), calls and judgments. The
 * stored run is re-scored by `metrics.ts` and exported to promptsmith by
 * `export.ts`; nothing here scores.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { messageOf } from "common-utils";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { z } from "zod";
import type { RequestBudget } from "../../../src/call.js";
import { isRouteKey } from "../../../src/segment/de/routes.js";
import {
	type SegmentInUnitsOutput,
	segmentInUnitsOutputSchema,
} from "../../evaluation/spec-corpus/segment-in-units.js";
import { readStoredJson } from "../../stored-json.js";
import type {
	Arm,
	ArmOptions,
	LinkJudgment,
	RouteJudgment,
} from "../de/arm.js";
import type { LabCase, LabSet } from "./corpus.js";
import {
	type CallRecord,
	callRecordSchema,
	type JevCache,
	type TransportRecord,
	transportRecordSchema,
} from "./jev-cache.js";

export type RepetitionRecord = {
	readonly outputs?: Readonly<Record<string, SegmentInUnitsOutput>>;
	readonly primary?: string;
	readonly calls: readonly CallRecord[];
	readonly wallMs: number;
	readonly routes?: readonly RouteJudgment[];
	readonly links?: readonly LinkJudgment[];
	readonly error?: string;
};

type CaseRun = {
	readonly id: string;
	readonly repetitions: readonly RepetitionRecord[];
};

export type LabRun = {
	readonly runId: string;
	readonly arm: string;
	readonly options: ArmOptions;
	readonly set: string;
	readonly setHash: string;
	readonly setGitHead: string;
	readonly subset: string;
	readonly gitHead: string;
	readonly startedAt: string;
	readonly finishedAt: string;
	readonly repetitions: number;
	/** Added to each repetition index sent to the judge; nonzero for a noise rerun. */
	readonly repetitionOffset?: number;
	/** The model requested. */
	readonly model: string;
	/** The models that answered; absent in runs made before pinning. */
	readonly modelResolved?: readonly string[];
	/** The manifest's code identity; absent in runs made before manifests. */
	readonly codeHash?: string;
	readonly dirty?: boolean;
	/** The fresh requests' retries and failures; absent in runs made before #858's follow-up. */
	readonly transport?: TransportRecord;
	readonly cases: readonly CaseRun[];
};

const labRunSchema = z.object({
	runId: z.string(),
	arm: z.string(),
	options: z.record(z.string(), z.string()),
	set: z.string(),
	setHash: z.string(),
	setGitHead: z.string(),
	subset: z.string(),
	gitHead: z.string(),
	startedAt: z.string(),
	finishedAt: z.string(),
	repetitions: z.number(),
	repetitionOffset: z.number().optional(),
	model: z.string(),
	modelResolved: z.array(z.string()).optional(),
	codeHash: z.string().optional(),
	dirty: z.boolean().optional(),
	transport: transportRecordSchema.optional(),
	cases: z.array(
		z.object({
			id: z.string(),
			repetitions: z.array(
				z.object({
					outputs: z
						.record(z.string(), segmentInUnitsOutputSchema)
						.optional(),
					primary: z.string().optional(),
					calls: z.array(callRecordSchema),
					wallMs: z.number(),
					routes: z
						.array(
							z.object({
								group: z.array(z.number()),
								choice: z.string().refine(isRouteKey),
								confidence: z.number(),
								share: z.number(),
								source: z.enum(["open", "identity"]),
							}),
						)
						.optional(),
					links: z
						.array(
							z.object({
								left: z.number(),
								right: z.number(),
								probability: z.number(),
							}),
						)
						.optional(),
					error: z.string().optional(),
				}),
			),
		}),
	),
}) satisfies z.ZodType<LabRun>;

export function runPath(root: string, runId: string): string {
	return join(root, "runs", `${runId}.json`);
}

export async function saveLabRun(root: string, run: LabRun): Promise<void> {
	await mkdir(join(root, "runs"), { recursive: true });
	await writeFile(runPath(root, run.runId), JSON.stringify(run));
}

export async function loadLabRun(root: string, runId: string): Promise<LabRun> {
	return readStoredJson(labRunSchema, runPath(root, runId));
}

/**
 * The arm over every case and repetition, `concurrency` cases at once and
 * each case's repetitions in turn, on the run's request budget. A
 * repetition that fails, a Defect included, is recorded with its message;
 * interrupting the run interrupts the asks in flight.
 */
export const runArm = Effect.fnUntraced(function* (args: {
	readonly runId: string;
	readonly arm: Arm;
	readonly options: ArmOptions;
	readonly set: LabSet;
	readonly subset: string;
	readonly cases: readonly LabCase[];
	readonly repetitions: number;
	readonly jev: JevCache;
	readonly concurrency: number;
	readonly gitHead: string;
	readonly repetitionOffset?: number;
	readonly codeHash?: string;
	readonly dirty?: boolean;
	readonly onProgress?: (done: number, total: number) => void;
}): Effect.fn.Return<LabRun, never, RequestBudget> {
	const startedAt = new Date().toISOString();
	let done = 0;
	const total = args.cases.length * args.repetitions;
	const repetitionOf = (labCase: LabCase, repetition: number) =>
		Effect.gen(function* () {
			const calls: CallRecord[] = [];
			const started = performance.now();
			const exit = yield* Effect.exit(
				Effect.suspend(() =>
					args.arm.run(labCase.input, {
						jev: args.jev,
						repetition: repetition + (args.repetitionOffset ?? 0),
						calls,
						options: args.options,
					}),
				),
			);
			const wallMs = performance.now() - started;
			done++;
			args.onProgress?.(done, total);
			if (Exit.isFailure(exit))
				return {
					calls,
					wallMs,
					error: messageOf(Cause.squash(exit.cause)),
				} satisfies RepetitionRecord;
			const result = exit.value;
			return {
				outputs: result.outputs,
				primary: result.primary,
				calls,
				wallMs,
				...(result.routes ? { routes: result.routes } : {}),
				...(result.links ? { links: result.links } : {}),
			} satisfies RepetitionRecord;
		});
	const cases = yield* Effect.forEach(
		args.cases,
		(labCase) =>
			Effect.gen(function* () {
				const repetitions: RepetitionRecord[] = [];
				for (
					let repetition = 0;
					repetition < args.repetitions;
					repetition++
				)
					repetitions.push(yield* repetitionOf(labCase, repetition));
				return { id: labCase.id, repetitions } satisfies CaseRun;
			}),
		{ concurrency: Math.max(1, args.concurrency) },
	);
	return {
		runId: args.runId,
		arm: args.arm.id,
		options: args.options,
		set: args.set.name,
		setHash: args.set.hash,
		setGitHead: args.set.gitHead,
		subset: args.subset,
		gitHead: args.gitHead,
		startedAt,
		finishedAt: new Date().toISOString(),
		repetitions: args.repetitions,
		repetitionOffset: args.repetitionOffset ?? 0,
		model: args.jev.model,
		modelResolved: [...args.jev.resolvedModels].sort(),
		...(args.codeHash === undefined ? {} : { codeHash: args.codeHash }),
		...(args.dirty === undefined ? {} : { dirty: args.dirty }),
		transport: args.jev.transport,
		cases,
	};
});
