import { expect, test } from "bun:test";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validateManifestPolicy } from "../lib/manifest-policy";
import { addWorkspace, temporaryRepository, writeJson } from "./helpers";

test("repository policy rejects governed dependency version mismatches", async () => {
	const root = await temporaryRepository();
	const first = await addWorkspace(root, { kind: "battery", name: "first" });
	const second = await addWorkspace(root, {
		kind: "battery",
		name: "second",
	});
	for (const [dir, version] of [
		[first, "^2.5.5"],
		[second, "^2.6.0"],
	] as const) {
		const manifest = await Bun.file(join(dir, "package.json")).json();
		manifest.devDependencies = { "@biomejs/biome": version };
		await writeJson(join(dir, "package.json"), manifest);
	}

	const issues = await validateManifestPolicy({
		cwd: root,
		mode: "repository",
	});

	expect(
		issues.some(
			(issue) =>
				issue.location.includes("second") &&
				issue.message.includes("@biomejs/biome must use ^2.5.5"),
		),
	).toBe(true);
});

test("repository policy allows package-specific governed peer ranges", async () => {
	const root = await temporaryRepository();
	const first = await addWorkspace(root, { kind: "battery", name: "first" });
	const second = await addWorkspace(root, {
		kind: "battery",
		name: "second",
	});
	const firstManifest = await Bun.file(join(first, "package.json")).json();
	firstManifest.devDependencies = { zod: "3.25.76" };
	firstManifest.peerDependencies = { zod: "^3.25.0 || ^4.0.0" };
	await writeJson(join(first, "package.json"), firstManifest);
	const secondManifest = await Bun.file(join(second, "package.json")).json();
	secondManifest.devDependencies = { zod: "3.25.76" };
	secondManifest.peerDependencies = { zod: "^4.0.0" };
	await writeJson(join(second, "package.json"), secondManifest);

	const issues = await validateManifestPolicy({
		cwd: root,
		mode: "repository",
	});

	expect(issues).toEqual([]);
});

test("package policy inspects only the caller workspace", async () => {
	const root = await temporaryRepository();
	const healthy = await addWorkspace(root, {
		kind: "battery",
		name: "healthy",
	});
	const broken = await addWorkspace(root, {
		kind: "battery",
		name: "broken",
	});
	await writeFile(join(broken, "package.json"), "{ definitely broken JSON");

	const issues = await validateManifestPolicy({
		cwd: healthy,
		mode: "package",
	});

	expect(issues).toEqual([]);
});
