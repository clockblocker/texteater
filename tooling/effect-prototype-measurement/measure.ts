import { resolve } from "node:path";

const scenarios = [
	"baseline",
	"effect-barrel",
	"effect-narrow",
	"prototype-import",
	"prototype-operation",
	"minimal-bundled-import",
	"minimal-bundled-operation",
] as const;

type Scenario = (typeof scenarios)[number];
const samplesPerScenario = 5;
const runner = resolve(import.meta.dir, "runner.ts");

function median(samples: readonly number[]): number {
	const sorted = [...samples].sort((left, right) => left - right);
	const value = sorted[Math.floor(sorted.length / 2)];
	if (value === undefined)
		throw new Error("Expected an odd non-empty sample set.");
	return value;
}

const measurements: Record<Scenario, readonly number[]> = {} as Record<
	Scenario,
	readonly number[]
>;
for (const scenario of scenarios) {
	const samples: number[] = [];
	for (let index = 0; index < samplesPerScenario; index += 1) {
		const child = Bun.spawn([process.execPath, runner, scenario], {
			cwd: resolve(
				import.meta.dir,
				"../../battery/dumgen/prototype-effect",
			),
			stdout: "pipe",
			stderr: "pipe",
		});
		const [exitCode, stdout, stderr] = await Promise.all([
			child.exited,
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
		]);
		if (exitCode !== 0) throw new Error(`${scenario} failed: ${stderr}`);
		const rss = Number(stdout.trim());
		if (!Number.isSafeInteger(rss) || rss <= 0)
			throw new Error(
				`${scenario} returned an invalid RSS value: ${stdout}`,
			);
		samples.push(rss);
	}
	measurements[scenario] = samples;
}

const baseline = median(measurements.baseline);
process.stdout.write(
	`${JSON.stringify(
		{
			contract: {
				baseline: "empty imported Bun TypeScript module",
				processesPerMeasurement: samplesPerScenario,
				statistic: "median max-RSS delta",
			},
			environment: {
				arch: process.arch,
				bunVersion: Bun.version,
				platform: process.platform,
			},
			baseline: {
				medianBytes: baseline,
				samplesBytes: measurements.baseline,
			},
			scenarios: Object.fromEntries(
				scenarios.slice(1).map((scenario) => {
					const samples = measurements[scenario];
					const medianBytes = median(samples);
					return [
						scenario,
						{
							deltaBytes: medianBytes - baseline,
							deltaMiB:
								Math.round(
									((medianBytes - baseline) / 1024 / 1024) *
										1000,
								) / 1000,
							medianBytes,
							samplesBytes: samples,
						},
					];
				}),
			),
		},
		null,
		2,
	)}\n`,
);
