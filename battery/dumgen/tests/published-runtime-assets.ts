import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	renameSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

const packageRoot = resolve(import.meta.dir, "..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "dumgen-package-smoke-"));

try {
	const packed = run(
		[
			"npm",
			"pack",
			"--json",
			"--ignore-scripts",
			"--workspaces=false",
			"--pack-destination",
			temporaryRoot,
		],
		packageRoot,
	);
	const result = JSON.parse(packed.stdout) as readonly Readonly<{
		filename: string;
		files: readonly Readonly<{ path: string }>[];
	}>[];
	const archive = result[0];
	if (archive === undefined) throw new Error("npm pack returned no archive.");
	for (const asset of ["dist/.runtime-prompt-artifacts.data"]) {
		if (!archive.files.some(({ path }) => path === asset))
			throw new Error(`The Dumgen tarball omitted ${asset}.`);
	}
	run(["tar", "-xzf", join(temporaryRoot, archive.filename)], temporaryRoot);

	const hostRoot = join(temporaryRoot, "installed");
	const nodeModules = join(hostRoot, "node_modules");
	mkdirSync(nodeModules, { recursive: true });
	renameSync(join(temporaryRoot, "package"), join(nodeModules, "dumgen"));
	assertOperationalDeclarationClosure(join(nodeModules, "dumgen", "dist"));
	for (const dependency of ["common-utils", "dumdict", "dumling", "dumrel"]) {
		const source = join(packageRoot, "node_modules", dependency);
		if (!existsSync(source))
			throw new Error(
				`Missing workspace dependency for smoke test: ${dependency}.`,
			);
		symlinkSync(
			realpathSync(source),
			join(nodeModules, dependency),
			"junction",
		);
	}

	const smokeScript = join(hostRoot, "smoke.mjs");
	writeFileSync(
		smokeScript,
		[
			'import { ParsingError, parseAsSegment } from "dumgen";',
			'import { combinedGermanKnowledgePrompt } from "dumgen/knowledge";',
			'const parsed = parseAsSegment({ kind: "Whitespace", text: " " });',
			'if (parsed instanceof ParsingError) throw new Error("Published parser failed.");',
			'if (combinedGermanKnowledgePrompt.prompt.systemPrompt.length === 0) throw new Error("Published prompt failed.");',
		].join("\n"),
	);
	for (const executable of ["bun", "node"])
		run([executable, smokeScript], hostRoot);

	const installedDist = join(nodeModules, "dumgen", "dist");
	const promptAsset = join(installedDist, ".runtime-prompt-artifacts.data");
	const promptBackup = `${promptAsset}.backup`;
	renameSync(promptAsset, promptBackup);
	const importOnlyScript = join(hostRoot, "import-only.mjs");
	writeFileSync(
		importOnlyScript,
		'import "dumgen"; import "dumgen/knowledge";',
	);
	for (const executable of ["bun", "node"])
		run([executable, importOnlyScript], hostRoot);
	const missingPrompt = run(["node", smokeScript], hostRoot, true);
	if (
		missingPrompt.status === 0 ||
		!missingPrompt.stderr.includes(
			"The Dumgen runtime prompt data asset is missing or unreadable.",
		)
	)
		throw new Error("Missing prompt sidecar did not fail closed clearly.");
	renameSync(promptBackup, promptAsset);

	console.log(
		"Published Dumgen runtime assets passed Bun/Node relocation smoke.",
	);
} finally {
	rmSync(temporaryRoot, { force: true, recursive: true });
}

function run(
	command: readonly string[],
	cwd: string,
	allowFailure = false,
): Readonly<{ status: number; stderr: string; stdout: string }> {
	const result = Bun.spawnSync([...command], {
		cwd,
		stderr: "pipe",
		stdout: "pipe",
	});
	const decoded = {
		status: result.exitCode,
		stderr: result.stderr.toString(),
		stdout: result.stdout.toString(),
	};
	if (!allowFailure && decoded.status !== 0)
		throw new Error(
			`Command failed: ${command.join(" ")}\n${decoded.stderr}`,
		);
	return decoded;
}

function assertOperationalDeclarationClosure(dist: string): void {
	const pending = [
		"index.d.ts",
		"knowledge.d.ts",
		"knowledge-runtime.d.ts",
		"openai-fetch.d.ts",
		"projection.d.ts",
		"runtime.d.ts",
		"vocabulary.d.ts",
	].map((entry) => join(dist, entry));
	const visited = new Set<string>();
	while (pending.length > 0) {
		const file = pending.pop();
		if (file === undefined || visited.has(file)) continue;
		if (!existsSync(file))
			throw new Error(`Missing operational declaration: ${file}.`);
		visited.add(file);
		const source = readFileSync(file, "utf8");
		if (/(?:from\s+|import\()["']zod["']/u.test(source))
			throw new Error(
				`Operational declaration closure reaches Zod: ${file}.`,
			);
		for (const match of source.matchAll(
			/(?:from\s+|import\()["'](\.[^"']+)["']/gu,
		)) {
			const specifier = match[1];
			if (specifier === undefined) continue;
			const unresolved = resolve(dirname(file), specifier);
			const declaration = specifier.endsWith(".js")
				? unresolved.replace(/\.js$/u, ".d.ts")
				: `${unresolved}.d.ts`;
			pending.push(
				existsSync(declaration)
					? declaration
					: join(unresolved, "index.d.ts"),
			);
		}
	}
}
