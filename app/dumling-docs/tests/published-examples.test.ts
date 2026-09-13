import { expect, test } from "bun:test";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { checkIfGrundform } from "dumling";
import { grundformLabel } from "../src/lib/unit-presentation";
import { surface } from "./fixtures";

const root = resolve(import.meta.dir, "..");
test("rendered unit and API examples compile against the published package", async () => {
	const directory = await mkdtemp(join(tmpdir(), "dumling-docs-examples-"));
	try {
		const entities = join(root, "src/generated/entities");
		const paths = (await readdir(entities, { recursive: true }))
			.filter((path) => path.endsWith(".md"))
			.map((path) => join(entities, path));
		paths.push(
			...["general/api", "lang/de", "lang/en", "lang/he"].map((path) =>
				join(root, "public", path + ".md"),
			),
		);
		let count = 0;
		for (const path of paths) {
			const markdown = await readFile(path, "utf8");
			const snippets = [
				...markdown.matchAll(/```ts\n([\s\S]*?)```/g),
			].map((match) => match[1]);
			if (!snippets.length) continue;
			await writeFile(
				join(directory, `example-${count++}.ts`),
				snippets.join("\n"),
			);
		}
		expect(count).toBeGreaterThan(100);
		await writeFile(
			join(directory, "tsconfig.json"),
			JSON.stringify({
				compilerOptions: {
					strict: true,
					noEmit: true,
					skipLibCheck: true,
					target: "ESNext",
					module: "ESNext",
					moduleResolution: "Bundler",
					types: [],
					paths: {
						dumling: [
							resolve(
								root,
								"../../battery/dumling/dist/index.d.ts",
							),
						],
						"dumling/types": [
							resolve(
								root,
								"../../battery/dumling/dist/types.d.ts",
							),
						],
						"dumling/schema/*": [
							resolve(
								root,
								"../../battery/dumling/dist/generated/schemas/*.d.ts",
							),
						],
					},
				},
			}),
		);
		const child = Bun.spawn(
			[
				process.execPath,
				resolve(root, "../../node_modules/typescript/bin/tsc"),
				"-p",
				join(directory, "tsconfig.json"),
			],
			{ stdout: "pipe", stderr: "pipe" },
		);
		const [out, error, exit] = await Promise.all([
			new Response(child.stdout).text(),
			new Response(child.stderr).text(),
			child.exited,
		]);
		expect(exit, out + error).toBe(0);
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
});

test("Grundform presentation preserves indeterminate grammar and contrary inflection", () => {
	expect(grundformLabel(surface)).toBe("Grundform");
	expect(grundformLabel({ ...surface, inflectionalFeatures: null })).toBe(
		"Undetermined",
	);
	const past = { ...surface, normalizedSurface: "walked" };
	expect(checkIfGrundform(past)).toEqual({ success: true, value: false });
	expect(grundformLabel(past)).toBe("Not Grundform");
});
