import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	evaluateSharedRss,
	mib,
	RSS_SHARED_BUDGET_BYTES,
} from "../dum-runtime-verification/policy";
import { findRepositoryRoot } from "../lib/workspaces";
import { preparePublishedRuntime } from "./published-runtime";

export const SHARED_RSS_SAMPLE_COUNT = 7;
export const SHARED_RSS_IMPORTS = [
	"dumling",
	"dumrel",
	"dumdict/runtime",
] as const;
const labels = ["effect/Effect", ...SHARED_RSS_IMPORTS];
export type SharedRssSample = readonly {
	readonly specifier: string;
	readonly peakBytes: number;
}[];

export function median(samples: readonly number[]): number {
	if (samples.length === 0 || samples.length % 2 === 0) {
		throw new Error("RSS median requires a non-empty odd sample count.");
	}
	const ordered = [...samples].sort((left, right) => left - right);
	const value = ordered[Math.floor(ordered.length / 2)];
	if (value === undefined) throw new Error("RSS samples unexpectedly empty.");
	return value;
}

export function processEnvWithoutBunInspect(): Record<
	string,
	string | undefined
> {
	const environment = { ...process.env };
	delete environment.BUN_INSPECT;
	delete environment.BUN_INSPECT_CONNECT_TO;
	delete environment.BUN_INSPECT_NOTIFY;
	return environment;
}

/** Subtract within each process before taking medians; shared dependencies are charged once. */
export function summarizeSharedRss(samples: readonly SharedRssSample[]) {
	if (samples.length !== SHARED_RSS_SAMPLE_COUNT)
		throw new Error(
			`Expected ${SHARED_RSS_SAMPLE_COUNT} shared RSS samples`,
		);
	for (const sample of samples) {
		if (
			sample.length !== labels.length ||
			sample.some(
				(point, index) =>
					point.specifier !== labels[index] ||
					!Number.isSafeInteger(point.peakBytes) ||
					point.peakBytes <= 0 ||
					(index > 0 &&
						point.peakBytes < sample[index - 1]!.peakBytes),
			)
		)
			throw new Error("Invalid or incomplete sequential RSS sample");
	}
	const stages = SHARED_RSS_IMPORTS.map((specifier, index) => ({
		specifier,
		addedPeakMedianBytes: median(
			samples.map(
				(sample) =>
					sample[index + 1]!.peakBytes - sample[index]!.peakBytes,
			),
		),
		cumulativePeakMedianBytes: median(
			samples.map(
				(sample) => sample[index + 1]!.peakBytes - sample[0]!.peakBytes,
			),
		),
	}));
	const addedPeakMedianBytes = stages.at(-1)!.cumulativePeakMedianBytes;
	return {
		baseline: "effect/Effect already loaded in the same process",
		metric: "Median of paired final peak RSS minus post-Effect peak RSS; sequential imports, no forced GC",
		limitations:
			"Local published-package import replay, not deployed tf-demo memory; excludes provider SDK, app initialization, and operations. Stage medians need not sum to the total median.",
		budgetBytes: RSS_SHARED_BUDGET_BYTES,
		addedPeakMedianBytes,
		...evaluateSharedRss(addedPeakMedianBytes),
		stages,
		samples,
	};
}
export type SharedRssReport = ReturnType<typeof summarizeSharedRss>;

/** Measures one staged package set in seven fresh processes with Effect preloaded. */
export async function measureSharedRss(
	runtimeRoot: string,
): Promise<SharedRssReport> {
	const runner = join(runtimeRoot, "shared-rss.mjs");
	await writeFile(
		runner,
		`
const points=[];
for (const specifier of ${JSON.stringify(labels)}) {
 await import(specifier);
 points.push({specifier,peakBytes:process.resourceUsage().maxRSS*1024});
}
console.log(JSON.stringify(points));
`,
	);
	const samples: SharedRssSample[] = [];
	for (let index = 0; index < SHARED_RSS_SAMPLE_COUNT; index++) {
		const child = Bun.spawn([process.execPath, runner], {
			cwd: runtimeRoot,
			env: processEnvWithoutBunInspect(),
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, stderr, exit] = await Promise.all([
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
			child.exited,
		]);
		if (exit !== 0) throw new Error(`Shared RSS probe failed: ${stderr}`);
		samples.push(JSON.parse(stdout));
	}
	return summarizeSharedRss(samples);
}

export function formatSharedRss(report: SharedRssReport): string {
	return (
		[
			`${report.passed ? "PASS" : "FAIL"} shared Dum import RSS: +${mib(report.addedPeakMedianBytes)} MiB after Effect; ceiling ${mib(report.budgetBytes)} MiB`,
			...report.stages.map(
				(stage) =>
					`  ${stage.specifier}: +${mib(stage.addedPeakMedianBytes)} MiB at this step; +${mib(stage.cumulativePeakMedianBytes)} MiB since Effect`,
			),
			"  Seven-process median of paired peak deltas. Local import replay; not deployed tf-demo or operation memory.",
		].join("\n") + "\n"
	);
}

if (import.meta.main) {
	const repository = await findRepositoryRoot(import.meta.dir);
	if (!Bun.argv.includes("--skip-build")) {
		const { buildPackages } = await import("./benchmark");
		await buildPackages(repository);
	}
	const root = await preparePublishedRuntime(repository);
	try {
		const report = await measureSharedRss(root);
		process.stdout.write(formatSharedRss(report));
		if (!report.passed) process.exitCode = 1;
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}
