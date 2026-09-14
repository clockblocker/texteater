import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { compileValidator } from "./compile-validator";

export const compiledConsumers = [
	"battery/dumling/src/parse-unit.ts",
	"battery/dumrel/src/validation.ts",
	"battery/dumgen/src/universal/validation.ts",
] as const;
export const compiledOutputs = ["dumling", "dumrel", "dumgen"].map(
	(name) => `battery/${name}/src/experiment-compiled-validation.ts`,
);

/** Same bundled script and assertions; avoid OS command-line size limits. */
export async function prepareCompilationGate(root: string) {
	const path = join(
		root,
		"battery/dumdict/tests/internal/relations-entrypoint.test.ts",
	);
	let source = await readFile(path, "utf8");
	const spawn =
		'const child = Bun.spawn([process.execPath, "--eval", output.text], {';
	if (!source.includes(spawn))
		throw new Error("Bundle execution gate patch drift");
	source = source
		.replace(
			'import { resolve } from "node:path";',
			'import { join, resolve } from "node:path";\nimport { mkdtemp, writeFile, rm } from "node:fs/promises";\nimport { tmpdir } from "node:os";',
		)
		.replace(
			spawn,
			`const directory=await mkdtemp(join(tmpdir(),"dum-aot-bundle-"));
	const script=join(directory,"bundle.mjs");
	await writeFile(script,output.text);
	try {
	const child = Bun.spawn([process.execPath, script], {`,
		)
		.replace(
			'expect(stdout.trim()).toBe("relations-ok");',
			'expect(stdout.trim()).toBe("relations-ok");\n} finally { await rm(directory,{recursive:true,force:true}); }',
		);
	await writeFile(path, source);
}

/** Called only by the isolated snapshot runner. Public artifact parsing stays unchanged. */
export async function applyCompilation(
	root: string,
	resolvePath: (root: string, path: string) => Promise<string>,
) {
	const reference = await readFile(
		join(root, "battery/common-utils/src/validation-artifact.ts"),
		"utf8",
	);
	const statistics = [];
	for (const [index, logical] of compiledConsumers.entries()) {
		const path = await resolvePath(root, logical);
		const packagePath = path.split("/").slice(0, 2).join("/");
		const artifactPath = join(
			root,
			packagePath,
			"src/generated/validation.ts",
		);
		const artifactModule = await import(artifactPath);
		const registry = JSON.parse(artifactModule.encodedValidation);
		const compiled = compileValidator(registry, reference);
		await writeFile(
			join(root, await resolvePath(root, compiledOutputs[index]!)),
			compiled.source,
		);
		let source = await readFile(join(root, path), "utf8");
		for (const required of [
			"type Constraint,",
			"parseValidationArtifact,",
			"JSON.parse(encodedValidation)",
		])
			if (!source.includes(required))
				throw new Error(
					`Compilation patch drift: ${path}: ${required}`,
				);
		source = source
			.replace("type Constraint,", "")
			.replace("parseValidationArtifact,", "");
		const compiledImport = logical.includes("/universal/")
			? "../experiment-compiled-validation.js"
			: "./experiment-compiled-validation.js";
		source = source
			.replace(
				/import \{ encodedValidation \} from "[^"]+";/,
				`import { compiledRegistry, parseCompiled as parseValidationArtifact, type CompiledValidator as Constraint } from ${JSON.stringify(compiledImport)};`,
			)
			.replace("JSON.parse(encodedValidation)", "compiledRegistry");
		if (source.includes("encodedValidation"))
			throw new Error(`Unpatched artifact import: ${path}`);
		await writeFile(join(root, path), source);
		statistics.push({
			package: packagePath.split("/")[1],
			roots: compiled.roots,
			nodes: compiled.nodes,
			sourceBytes: compiled.sourceBytes,
			sourceSha256: createHash("sha256")
				.update(compiled.source)
				.digest("hex"),
		});
	}
	await writeFile(
		join(
			root,
			"battery/experiments/dum-validation/compilation-statistics.json",
		),
		JSON.stringify(
			{
				mode: "ahead-of-time JavaScript functions; original branch order; exact diagnostics; no runtime compiler or interpreter fallback",
				baseline: "external-runtime",
				scope: "Dumling, Dumrel and Dumgen internal registries. Dumdict consumes those packages but retains its own artifact parser. Public parseValidationArtifact and mutable caller-supplied artifacts are unchanged.",
				packages: statistics,
			},
			null,
			2,
		) + "\n",
	);
}
