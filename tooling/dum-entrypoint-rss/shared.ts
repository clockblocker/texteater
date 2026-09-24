import { rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	evaluateSharedRss,
	RSS_SHARED_BUDGET_BYTES,
} from "../dum-runtime-verification/policy";
import { findRepositoryRoot } from "../lib/workspaces";
import { preparePublishedRuntime } from "./published-runtime";

export const SHARED_RSS_SAMPLE_COUNT = 7;
export const SHARED_RSS_IMPORTS = [
	"dumling",
	"dumrel",
	"dumdict/runtime",
	"dumgen",
] as const;
const labels = ["effect/Effect", ...SHARED_RSS_IMPORTS];
export type SharedRssSample = readonly {
	readonly specifier: string;
	readonly peakBytes: number;
}[];

const median = (values: number[]) =>
	[...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;

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
		const env = { ...process.env };
		delete env.BUN_INSPECT;
		delete env.BUN_INSPECT_CONNECT_TO;
		delete env.BUN_INSPECT_NOTIFY;
		const child = Bun.spawn([process.execPath, runner], {
			cwd: runtimeRoot,
			env,
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
	const mib = (value: number) => (value / 1048576).toFixed(3);
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
