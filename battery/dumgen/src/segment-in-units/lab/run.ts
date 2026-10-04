/**
 * Runs one arm over a frozen case subset with repetitions and stores every
 * repetition's outputs (one per assembly policy), calls and judgments. The
 * stored run is re-scored by `metrics.ts` and exported to promptsmith by
 * `export.ts`; nothing here scores.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as Effect from "effect/Effect";
import type { SegmentInUnitsOutput } from "../../evaluation/spec-corpus/segment-in-units.js";
import type {
	Arm,
	ArmOptions,
	LinkJudgment,
	RouteJudgment,
} from "../de/arm.js";
import type { LabCase, LabSet } from "./corpus.js";
import type { CallRecord, JevCache, TransportRecord } from "./jev-cache.js";

export type RepetitionRecord = {
	readonly outputs?: Readonly<Record<string, SegmentInUnitsOutput>>;
	readonly primary?: string;
	readonly calls: readonly CallRecord[];
	readonly wallMs: number;
	readonly routes?: readonly RouteJudgment[];
	readonly links?: readonly LinkJudgment[];
	readonly error?: string;
};

export type CaseRun = {
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

export function runPath(root: string, runId: string): string {
	return join(root, "runs", `${runId}.json`);
}

export async function saveLabRun(root: string, run: LabRun): Promise<void> {
	await mkdir(join(root, "runs"), { recursive: true });
	await writeFile(runPath(root, run.runId), JSON.stringify(run));
}

export async function loadLabRun(root: string, runId: string): Promise<LabRun> {
	return JSON.parse(await readFile(runPath(root, runId), "utf8")) as LabRun;
}

export async function runArm(args: {
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
}): Promise<LabRun> {
	const startedAt = new Date().toISOString();
	let done = 0;
	const total = args.cases.length * args.repetitions;
	const repetitionOf = async (
		labCase: LabCase,
		repetition: number,
	): Promise<RepetitionRecord> => {
		const calls: CallRecord[] = [];
		const started = performance.now();
		try {
			const result = await args.arm.run(labCase.input, {
				jev: args.jev,
				repetition: repetition + (args.repetitionOffset ?? 0),
				calls,
				options: args.options,
			});
			return {
				outputs: result.outputs,
				primary: result.primary,
				calls,
				wallMs: performance.now() - started,
				...(result.routes ? { routes: result.routes } : {}),
				...(result.links ? { links: result.links } : {}),
			};
		} catch (error) {
			return {
				calls,
				wallMs: performance.now() - started,
				error: error instanceof Error ? error.message : String(error),
			};
		} finally {
			done++;
			args.onProgress?.(done, total);
		}
	};
	// `concurrency` cases at once, each case's repetitions in turn.
	const cases = await Effect.runPromise(
		Effect.forEach(
			args.cases,
			(labCase) =>
				Effect.promise(async (): Promise<CaseRun> => {
					const repetitions: RepetitionRecord[] = [];
					for (
						let repetition = 0;
						repetition < args.repetitions;
						repetition++
					)
						repetitions.push(
							await repetitionOf(labCase, repetition),
						);
					return { id: labCase.id, repetitions };
				}),
			{ concurrency: Math.max(1, args.concurrency) },
		),
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
}
