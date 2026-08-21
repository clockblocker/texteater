import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { findRepositoryRoot } from "../lib/workspaces";
import {
	DUM_ENTRYPOINTS,
	type DumEntryPoint,
	type OperationalEntryPoint,
	operationalEntrypoints,
} from "./inventory";
import { type RssMeasurement, summarizeSamples } from "./measurement";
import {
	auditEntrypointReachability,
	type EntrypointReachability,
} from "./reachability";

export const SAMPLE_COUNT = 5;
const IMPORT_BUDGET_MIB = 5;
const OPERATION_BUDGET_MIB = 5.3;
const packages = ["dumling", "dumrel", "dumdict", "dumgen"] as const;

type MeasurementMode = "baseline" | "import-only" | "import-plus-operation";

export type MeasuredOperationalEntryPoint = OperationalEntryPoint & {
	readonly importOnly: RssMeasurement;
	readonly importPlusOperation: RssMeasurement;
	readonly reachability: EntrypointReachability;
};

export type Report = {
	readonly baseline: {
		readonly medianBytes: number;
		readonly samplesBytes: readonly number[];
	};
	readonly contract: {
		readonly baseline: string;
		readonly importBudgetMiB: number;
		readonly operationBudgetMiB: number;
		readonly processesPerMeasurement: number;
		readonly statistic: string;
	};
	readonly entrypoints: readonly (
		| Exclude<DumEntryPoint, OperationalEntryPoint>
		| MeasuredOperationalEntryPoint
	)[];
	readonly environment: {
		readonly arch: string;
		readonly bunVersion: string;
		readonly capturedAt: string;
		readonly packageSourcesDirty: boolean;
		readonly platform: string;
		readonly sourceCommit: string;
	};
};

async function run(command: readonly string[], cwd: string): Promise<string> {
	const process = Bun.spawn([...command], {
		cwd,
		env: processEnvWithoutBunInspect(),
		stderr: "pipe",
		stdout: "pipe",
	});
	const [exitCode, stdout, stderr] = await Promise.all([
		process.exited,
		new Response(process.stdout).text(),
		new Response(process.stderr).text(),
	]);
	if (exitCode !== 0) {
		throw new Error(
			`Command failed (${command.join(" ")}):\n${stderr || stdout}`,
		);
	}
	return stdout;
}

function processEnvWithoutBunInspect(): Record<string, string | undefined> {
	const environment = { ...process.env };
	delete environment.BUN_INSPECT;
	delete environment.BUN_INSPECT_CONNECT_TO;
	delete environment.BUN_INSPECT_NOTIFY;
	return environment;
}

export async function buildPackages(root: string): Promise<void> {
	for (const packageName of packages) {
		process.stderr.write(
			`Building ${packageName} for the published-entrypoint audit…\n`,
		);
		await run(
			[process.execPath, "run", "build"],
			join(root, "battery", packageName),
		);
	}
}

async function sample(
	root: string,
	mode: MeasurementMode,
	entrypoint?: { operationId: string; specifier: string },
): Promise<number[]> {
	const runner = join(root, "tooling", "dum-entrypoint-rss", "runner.ts");
	const samples: number[] = [];
	for (let iteration = 0; iteration < SAMPLE_COUNT; iteration += 1) {
		const args = [process.execPath, runner, "--mode", mode];
		if (entrypoint !== undefined) {
			args.push("--specifier", entrypoint.specifier);
			if (mode === "import-plus-operation") {
				args.push("--operation", entrypoint.operationId);
			}
		}
		const stdout = (await run(args, root)).trim();
		const rss = Number(stdout);
		if (!Number.isSafeInteger(rss) || rss <= 0) {
			throw new Error(
				`RSS runner returned an invalid byte count: ${stdout}`,
			);
		}
		samples.push(rss);
	}
	return samples;
}

export function markdownFor(report: Report): string {
	const schemaAuthoringSurfaces = report.entrypoints
		.filter(
			({ classification }) =>
				classification === "schema-authoring-exempt",
		)
		.map(({ specifier }) => `\`${specifier}\``)
		.join(", ");
	const lines = [
		"# Dum operational-entrypoint RSS baseline",
		"",
		`Captured ${report.environment.capturedAt} from \`${report.environment.sourceCommit}\` with Bun ${report.environment.bunVersion} on ${report.environment.platform}/${report.environment.arch}.`,
		"",
		`Contract: five fresh Bun processes per measurement; median max RSS delta over an empty imported module; import-only must remain below ${report.contract.importBudgetMiB} MiB and import-plus-operation must remain at or below ${report.contract.operationBudgetMiB} MiB. Raw byte samples are retained in the adjacent JSON artifact.`,
		"",
		`Empty-module samples: ${report.baseline.samplesBytes.map((sample) => `\`${sample}\``).join(", ")} bytes; median \`${report.baseline.medianBytes}\` bytes.`,
		"",
		"## Canonical matrix",
		"",
		"| Entrypoint | Classification | Representative operation | Import delta (MiB) | Import + operation delta (MiB) | Reachable schema/heavy dependencies |",
		"| --- | --- | --- | ---: | ---: | --- |",
	];

	for (const entrypoint of report.entrypoints) {
		if (entrypoint.classification !== "operational") {
			lines.push(
				`| \`${entrypoint.specifier}\` | ${entrypoint.classification} | ${entrypoint.rationale} | — | — | — |`,
			);
			continue;
		}
		const dependencies = [
			...entrypoint.reachability.schemaEntrypoints.map(
				(dependency) => `\`${dependency}\``,
			),
			...entrypoint.reachability.heavyweightDependencies.map(
				(dependency) => `\`${dependency}\``,
			),
		];
		lines.push(
			`| \`${entrypoint.specifier}\` | operational | ${entrypoint.operation.description} | ${entrypoint.importOnly.deltaMiB.toFixed(3)} | ${entrypoint.importPlusOperation.deltaMiB.toFixed(3)} | ${dependencies.join(", ") || "none"} |`,
		);
	}

	lines.push(
		"",
		"## Interpretation",
		"",
		"The user-approved 5.3 MiB operation ceiling is one global allowance for observed five-process median measurement noise around 5 MiB, not a per-package waiver. The import ceiling remains strictly below 5 MiB, and heavyweight/schema reachability remains a strict zero-tolerance rule.",
		"",
		`The explicit schema/model-authoring escape hatches are ${schemaAuthoringSurfaces}. They are exempt from the operational budget; any schema reachability from an operational package root remains a violation rather than gaining an exemption.`,
		"",
		"A vocabulary or settings subpath is operational runtime data, so it is measured. Type-only JavaScript and `package.json` metadata are inventoried for exhaustiveness but not benchmarked.",
		"",
		"Reachability is derived from the built public JavaScript graph. `zod` and `codec-builder-library` identify schema/runtime weight; `openai` identifies the provider SDK loaded by a convenience entrypoint. An explicit `/schema` dependency reachable from an operational entrypoint is always reported even when Zod is also visible directly.",
		"",
		"## Reproduce",
		"",
		"```sh",
		"bun run benchmark:dum-entrypoints",
		"bun run benchmark:dum-entrypoints --write",
		"```",
		"",
		"The first command rebuilds the four packages and prints the report. `--write` also replaces this Markdown file and its JSON companion.",
		"",
	);
	return lines.join("\n");
}

export async function createReport(root: string): Promise<Report> {
	const baselineSamplesBytes = await sample(root, "baseline");
	const baselineMedianBytes = [...baselineSamplesBytes].sort(
		(left, right) => left - right,
	)[Math.floor(SAMPLE_COUNT / 2)] as number;
	const sourceCommit = (await run(["git", "rev-parse", "HEAD"], root)).trim();
	const packageStatus = (
		await run(
			[
				"git",
				"status",
				"--porcelain",
				"--",
				...packages.map((packageName) => `battery/${packageName}`),
			],
			root,
		)
	).trim();
	const entries: MeasuredOperationalEntryPoint[] = [];

	for (const entrypoint of operationalEntrypoints()) {
		process.stderr.write(`Measuring ${entrypoint.specifier}…\n`);
		const scenario = {
			operationId: entrypoint.operation.id,
			specifier: entrypoint.specifier,
		};
		const importSamples = await sample(root, "import-only", scenario);
		const operationSamples = await sample(
			root,
			"import-plus-operation",
			scenario,
		);
		const reachability = await auditEntrypointReachability(
			entrypoint.specifier,
		);
		entries.push({
			...entrypoint,
			importOnly: summarizeSamples(importSamples, baselineSamplesBytes),
			importPlusOperation: summarizeSamples(
				operationSamples,
				baselineSamplesBytes,
			),
			reachability,
		});
	}

	const measuredBySpecifier = new Map(
		entries.map((entrypoint) => [entrypoint.specifier, entrypoint]),
	);
	return {
		baseline: {
			medianBytes: baselineMedianBytes,
			samplesBytes: baselineSamplesBytes,
		},
		contract: {
			baseline: "empty imported Bun module",
			importBudgetMiB: IMPORT_BUDGET_MIB,
			operationBudgetMiB: OPERATION_BUDGET_MIB,
			processesPerMeasurement: SAMPLE_COUNT,
			statistic: "median max RSS delta",
		},
		entrypoints: DUM_ENTRYPOINTS.map((entrypoint) => {
			if (entrypoint.classification !== "operational") return entrypoint;
			const measured = measuredBySpecifier.get(entrypoint.specifier);
			if (measured === undefined) {
				throw new Error(
					`Missing RSS measurement for ${entrypoint.specifier}.`,
				);
			}
			return measured;
		}),
		environment: {
			arch: process.arch,
			bunVersion: Bun.version,
			capturedAt: new Date().toISOString(),
			packageSourcesDirty: packageStatus.length > 0,
			platform: process.platform,
			sourceCommit,
		},
	};
}

async function runBenchmarkCli(): Promise<void> {
	const root = await findRepositoryRoot(import.meta.dir);
	if (!Bun.argv.includes("--skip-build")) await buildPackages(root);
	const report = await createReport(root);
	const markdown = markdownFor(report);
	process.stdout.write(markdown);

	if (Bun.argv.includes("--write")) {
		const directory = join(root, "docs", "benchmarks");
		const jsonPath = join(
			directory,
			"dum-operational-entrypoint-rss-baseline.json",
		);
		const markdownPath = join(
			directory,
			"dum-operational-entrypoint-rss-baseline.md",
		);
		await mkdir(directory, { recursive: true });
		await Promise.all([
			Bun.write(jsonPath, `${JSON.stringify(report, null, "\t")}\n`),
			Bun.write(markdownPath, markdown),
		]);
		await run(
			[
				join(root, "node_modules", ".bin", "biome"),
				"format",
				"--write",
				jsonPath,
			],
			root,
		);
	}
}

if (import.meta.main) await runBenchmarkCli();
