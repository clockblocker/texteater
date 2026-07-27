import { expect, test } from "bun:test";

test("docs workspace keeps its package commands local", async () => {
	const manifest = await Bun.file(
		new URL("../package.json", import.meta.url),
	).json();

	expect(manifest.private).toBe(true);
	expect(manifest.scripts.build).toContain(
		"../../tooling/manifest-policy.ts package",
	);
	expect(manifest.scripts.validate).toBe(
		"bun ../../tooling/validate-package.ts",
	);
});
