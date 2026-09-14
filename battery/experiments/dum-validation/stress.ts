import { createHash } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { variants } from "./variants";

// This cheap standalone gate also makes it possible to strengthen adversarial
// coverage without repeating a complete five-process performance matrix.
const root = await mkdtemp(join(tmpdir(), "dum-validator-stress-"));
const repository = resolve(import.meta.dir, "../../..");
try {
	const source = join(repository, "battery/common-utils/src");
	await cp(source, join(root, "battery/common-utils/src"), {
		recursive: true,
	});
	const original = await readFile(
		join(source, "validation-artifact.ts"),
		"utf8",
	);
	await writeFile(
		join(
			root,
			"battery/common-utils/src/__experiment_reference_validation.ts",
		),
		original,
	);
	const gateSource = await readFile(
		join(import.meta.dir, "adversarial.ts"),
		"utf8",
	);
	const gatePath = join(
		root,
		"battery/experiments/dum-validation/adversarial.ts",
	);
	await mkdir(join(root, "battery/experiments/dum-validation"), {
		recursive: true,
	});
	await writeFile(gatePath, gateSource);
	const results = [];
	for (const variant of variants.filter((variant) =>
		["baseline", "literal-dispatch", "planned-dispatch"].includes(
			variant.id,
		),
	)) {
		await writeFile(
			join(root, "battery/common-utils/src/validation-artifact.ts"),
			original,
		);
		await variant.apply(root);
		const child = Bun.spawn(
			[
				process.execPath,
				"-e",
				`const { adversarialGate } = await import(${JSON.stringify(gatePath)}); console.log(JSON.stringify(await adversarialGate(${JSON.stringify(root)})));`,
			],
			{ cwd: root, stdout: "pipe", stderr: "pipe" },
		);
		const text = await new Response(child.stdout).text();
		if ((await child.exited) !== 0)
			throw new Error(await new Response(child.stderr).text());
		results.push({ id: variant.id, ...JSON.parse(text) });
	}
	const report = {
		method: "Independent adversarial replay. Stable definitions identity is required to exercise cached-plan staleness; readonly-artifact mutation remains a separate robustness contract.",
		sourceSha256: createHash("sha256").update(original).digest("hex"),
		gateSha256: createHash("sha256").update(gateSource).digest("hex"),
		results,
	};
	await writeFile(Bun.argv[2]!, `${JSON.stringify(report, null, 2)}\n`);
	console.log(JSON.stringify(report, null, 2));
} finally {
	await rm(root, { recursive: true, force: true });
}
