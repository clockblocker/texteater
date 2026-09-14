import { createHash } from "node:crypto";
import {
	cp,
	lstat,
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { changedPaths, resolvePath, variants } from "./variants";
import { compiledOutputs, prepareCompilationGate } from "./apply-compilation";

const repository = resolve(import.meta.dir, "../../..");
const relativeExperiment = "battery/experiments/dum-validation";
const argument = (name: string) => {
	const index = Bun.argv.indexOf(name);
	return index < 0 ? undefined : Bun.argv[index + 1];
};
if (Bun.argv.includes("--help")) {
	console.log(`Dum validation structural experiments (production code and budgets are never edited).

  bun ${relativeExperiment}/run.ts
  bun ${relativeExperiment}/run.ts --variants literal-dispatch,shared-chunks
  bun ${relativeExperiment}/run.ts --variants external-runtime,aot-validators
  bun ${relativeExperiment}/run.ts --verify-only aot-validators
  bun ${relativeExperiment}/run.ts --verify-only operation-split-chain
  bun ${relativeExperiment}/run.ts --verify-only external-runtime,operation-split-chain,catalog-lazy,catalog-and-registries
  bun ${relativeExperiment}/catalog-loading-profile.ts /absolute/path/to/catalog-results.json
  bun ${relativeExperiment}/operation-loading-profile.ts /absolute/path/to/profile.json
  bun test ${relativeExperiment}/compilation.test.ts
  bun ${relativeExperiment}/run.ts --output /absolute/path/to/results

Creates one isolated source snapshot, installs with the frozen lockfile, and
rebuilds each variant. Every variant, including baseline, faces the same gate.
Baseline defects remain visible; canonical contracts decide eligibility.
Every alternative must preserve canonical acceptance, normalized output, exact
errors (including published-package failures and shared error identity), public
exports/types, composable schemas, deterministic generation,
runtime/declaration isolation, and dictionary/app workflows. Mutable-artifact
stress is reported separately from the readonly typed contract.

Five fresh processes measure each RSS scenario. Additional profiles separate
cold cost, warm throughput, invalid inputs, graph size, and retained heap.
Existing RSS limits are reported verbatim; a faster but gate-failing variant
is ineligible. No live model calls, deployment, or database reset are performed.

Results include source and experiment fingerprints, raw measurements, gate
logs and verdicts. Measurement runs always include baseline. --verify-only
checks the selected comma-separated variants without timing or RSS measurements. Available alternatives:
${variants
	.filter((v) => v.id !== "baseline")
	.map((v) => `  ${v.id}: ${v.question}`)
	.join("\n")}`);
	process.exit(0);
}

const verifyOnly = argument("--verify-only");
const requested = verifyOnly
	? verifyOnly.split(",")
	: argument("--variants")?.split(",");
if (requested?.some((id) => !variants.some((variant) => variant.id === id)))
	throw new Error("Unknown variant; run with --help");
const selected = variants.filter(
	(variant) =>
		(!verifyOnly && variant.id === "baseline") ||
		requested === undefined ||
		requested.includes(variant.id),
);
const stamp = new Date().toISOString().replaceAll(":", "-");
const output = resolve(
	argument("--output") ?? join(import.meta.dir, ".runs", stamp),
);
await mkdir(output, { recursive: true });
const snapshot = await mkdtemp(join(tmpdir(), "dum-validation-experiment-"));

async function capture(args: string[], cwd = repository) {
	const child = Bun.spawn(args, { cwd, stdout: "pipe", stderr: "pipe" });
	const text = await new Response(child.stdout).text();
	if ((await child.exited) !== 0)
		throw new Error(await new Response(child.stderr).text());
	return text;
}
interface Check {
	id: string;
	passed: boolean;
	exitCode: number;
	milliseconds: number;
	log: string;
}
async function command(
	id: string,
	args: string[],
	directory: string,
): Promise<Check> {
	const log = join(directory, `${id}.log`);
	const stream = Bun.file(log).writer();
	const started = performance.now();
	const child = Bun.spawn(args, {
		cwd: snapshot,
		env: {
			...process.env,
			PATH: `${snapshot}/node_modules/node/bin:${snapshot}/node_modules/.bin:${process.env.PATH ?? ""}`,
			CI: "1",
		},
		stdout: "pipe",
		stderr: "pipe",
	});
	const drain = async (source: ReadableStream<Uint8Array>) => {
		for await (const chunk of source) stream.write(chunk);
	};
	await Promise.all([drain(child.stdout), drain(child.stderr)]);
	const exitCode = await child.exited;
	await stream.end();
	console.log(`${exitCode === 0 ? "PASS" : "FAIL"} ${id}`);
	return {
		id,
		passed: exitCode === 0,
		exitCode,
		milliseconds: performance.now() - started,
		log: log.slice(output.length + 1),
	};
}

const results: Record<string, unknown>[] = [];
try {
	const commit = (await capture(["git", "rev-parse", "HEAD"])).trim();
	const diff = await capture(["git", "diff", "HEAD", "--binary"]);
	const initialStatus = await capture(["git", "status", "--porcelain"]);
	const files = [
		...new Set(
			(
				await capture([
					"git",
					"ls-files",
					"--cached",
					"--others",
					"--exclude-standard",
					"-z",
				])
			)
				.split("\0")
				.filter(
					(file) =>
						Boolean(file) &&
						!file.startsWith(relativeExperiment + "/"),
				),
		),
	];
	const sourceHash = createHash("sha256");
	const observed: [string, number, number][] = [];
	for (const file of files.sort()) {
		const source = join(repository, file);
		let stat;
		try {
			stat = await lstat(source);
		} catch {
			continue;
		}
		observed.push([source, stat.mtimeMs, stat.size]);
		sourceHash.update(file).update(await readFile(source));
		await mkdir(dirname(join(snapshot, file)), { recursive: true });
		await cp(source, join(snapshot, file));
	}
	for (const [path, modified, size] of observed) {
		const stat = await lstat(path);
		if (stat.mtimeMs !== modified || stat.size !== size)
			throw new Error(
				"Sources changed while snapshotting; rerun to get a coherent baseline.",
			);
	}
	if (
		diff !== (await capture(["git", "diff", "HEAD", "--binary"])) ||
		initialStatus !== (await capture(["git", "status", "--porcelain"]))
	)
		throw new Error(
			"Sources changed while snapshotting; rerun to get a coherent baseline.",
		);
	const experimentHash = createHash("sha256");
	await mkdir(join(snapshot, relativeExperiment), { recursive: true });
	for (const file of (await readdir(import.meta.dir))
		.filter((file) => /\.(ts|json)$/.test(file))
		.sort()) {
		const bytes = await readFile(join(import.meta.dir, file));
		experimentHash.update(file).update(bytes);
		await writeFile(join(snapshot, relativeExperiment, file), bytes);
	}
	await writeFile(
		join(output, "metadata.json"),
		JSON.stringify(
			{
				commit,
				sourceSha256: sourceHash.digest("hex"),
				experimentSha256: experimentHash.digest("hex"),
				trackedDiffSha256: createHash("sha256")
					.update(diff)
					.digest("hex"),
				startedAt: stamp,
				bun: Bun.version,
				platform: process.platform,
				arch: process.arch,
				variants: selected.map((v) => v.id),
				mode: verifyOnly ? "gate-only" : "gate-and-measurements",
				gateAdjustment:
					"The relation-entrypoint test runs its unchanged bundle from a temporary file, avoiding the OS argument-size limit. Assertions are unchanged.",
			},
			null,
			2,
		),
	);
	await writeFile(join(output, "source.diff"), diff);
	await capture(
		[
			"git",
			"init",
			"--quiet",
			"--initial-branch=codex/dum-validation-experiment",
		],
		snapshot,
	);
	await capture(["git", "add", "."], snapshot);
	await capture(
		[
			"git",
			"-c",
			"user.name=Dum validation experiment",
			"-c",
			"user.email=experiment@localhost",
			"commit",
			"--quiet",
			"-m",
			`Isolated experiment source at ${commit}`,
		],
		snapshot,
	);
	const installation = await command(
		"fresh-install",
		["bun", "install", "--frozen-lockfile"],
		output,
	);
	if (!installation.passed)
		throw new Error("Fresh installation failed; see fresh-install.log");
	const originals = new Map(
		await Promise.all(
			changedPaths.map(async (logical) => {
				const path = await resolvePath(snapshot, logical);
				return [
					path,
					await readFile(join(snapshot, path), "utf8"),
				] as const;
			}),
		),
	);
	// This reference is used only by the adversarial comparator and is never an
	// entrypoint of a published package or a dependency of the measured runtime.
	await writeFile(
		join(
			snapshot,
			"battery/common-utils/src/__experiment_reference_validation.ts",
		),
		originals.get(changedPaths[0])!,
	);
	for (const variant of selected) {
		for (const [path, source] of originals)
			await writeFile(join(snapshot, path), source);
		await prepareCompilationGate(snapshot);
		for (const path of compiledOutputs)
			await rm(join(snapshot, await resolvePath(snapshot, path)), {
				force: true,
			});
		for (const owner of ["dumling", "dumrel", "dumgen"])
			await rm(
				join(
					snapshot,
					"battery",
					owner,
					"src/experiment-operation-registry.ts",
				),
				{ force: true },
			);
		await rm(
			join(snapshot, relativeExperiment, "compilation-statistics.json"),
			{ force: true },
		);
		await variant.apply(snapshot);
		const directory = join(output, variant.id);
		await mkdir(directory, { recursive: true });
		if (variant.id.startsWith("operation-split-"))
			await cp(
				join(
					snapshot,
					relativeExperiment,
					"operation-splitting-statistics.json",
				),
				join(directory, "operation-splitting.json"),
			);
		if (variant.id === "aot-validators")
			await cp(
				join(
					snapshot,
					relativeExperiment,
					"compilation-statistics.json",
				),
				join(directory, "compilation.json"),
			);
		console.log(`\n${variant.id}: ${variant.question}`);
		const checks: Check[] = [];
		checks.push(
			await command(
				"refresh-derived-policy",
				["bun", "app/tf-demo/tooling/compile-relation-verdict.ts"],
				directory,
			),
		);
		checks.push(
			await command(
				"build",
				[
					join(snapshot, "node_modules/.bin/turbo"),
					"run",
					"build",
					"--force",
				],
				directory,
			),
		);
		if (checks[0]!.passed && checks[1]!.passed) {
			const gateCommands: [string, string[]][] = [
				[
					"generated-validator-semantics",
					[
						"bun",
						"test",
						join(
							snapshot,
							relativeExperiment,
							"compilation.test.ts",
						),
						join(
							snapshot,
							relativeExperiment,
							"split-registries.test.ts",
						),
					],
				],
				["types-and-schema-consumers", ["bun", "run", "check"]],
				[
					"compiler-and-interpreter-contracts",
					[
						"bun",
						"test",
						"battery/common-utils/tests",
						"battery/codegen/tests",
					],
				],
				[
					"dum-package-contracts",
					[
						"bun",
						"test",
						...(await Promise.all(
							["dumling", "dumrel", "dumdict", "dumgen"].map(
								(name) =>
									resolvePath(
										snapshot,
										`battery/${name}/tests`,
									),
							),
						)),
					],
				],
				[
					"consumer-workflows",
					[
						"bun",
						"test",
						"app/laboratory/tests",
						"app/tf-demo/tests",
						"app/dumling-docs/tests",
					],
				],
				[
					"public-export-contracts",
					[
						"bun",
						"test",
						"tooling/tests/dum-parser-interface-contract.test.ts",
						"tooling/tests/dum-zod-surface-contract.test.ts",
						"tooling/tests/dumling-cutover.test.ts",
					],
				],
				[
					"published-runtime-failure-paths",
					[
						"bun",
						join(snapshot, relativeExperiment, "published-gate.ts"),
						join(directory, "published-gate.json"),
					],
				],
				[
					"canonical-differential-and-isolation",
					[
						"bun",
						join(snapshot, relativeExperiment, "dx-gate.ts"),
						join(directory, "dx-gate.json"),
					],
				],
			];
			for (const [id, args] of gateCommands)
				checks.push(await command(id, args, directory));
			if (!verifyOnly) {
				const measurement = await command(
					"rss",
					[
						"bun",
						join(snapshot, relativeExperiment, "measure.ts"),
						join(directory, "rss.json"),
					],
					directory,
				);
				const profile = await command(
					"workload-profile",
					[
						"bun",
						join(snapshot, relativeExperiment, "profile.ts"),
						join(directory, "profile.json"),
					],
					directory,
				);
				checks.push(measurement, profile);
			}
		}
		const passed =
			checks.length === (verifyOnly ? 10 : 12) &&
			checks.every((check) => check.passed);
		const gate = (await Bun.file(join(directory, "dx-gate.json")).exists())
			? JSON.parse(
					await readFile(join(directory, "dx-gate.json"), "utf8"),
				)
			: undefined;
		const mutableSafe = gate?.adversarial?.mutableArtifactStress === "pass";
		results.push({
			gateVersion: 3,
			mode: verifyOnly ? "gate-only" : "gate-and-measurements",
			id: variant.id,
			question: variant.question,
			tradeoff: variant.tradeoff,
			dxPassed: passed,
			eligibleForReview: passed && mutableSafe,
			limitation: mutableSafe
				? null
				: "Mutable artifact stress failed or was unavailable; adoption requires resolving or explicitly accepting that contract.",
			checks,
		});
		await writeFile(
			join(output, "summary.json"),
			`${JSON.stringify({ note: "No budget changes. DX checks and artifact-mutation robustness are separate from existing RSS policy results.", results }, null, 2)}\n`,
		);
		if (variant.id === "baseline" && !passed)
			console.log(
				"Baseline fails required features; it is a measurement reference, not an acceptable implementation.",
			);
	}
	console.log(`\nResults: ${output}`);
} finally {
	await rm(snapshot, { recursive: true, force: true });
}
