import { expect, test } from "bun:test";
import { realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(import.meta.dir, "../..");

test("the dumling package name resolves only to the replacement", async () => {
	const replacementManifest = await realpath(
		fileURLToPath(import.meta.resolve("dumling/package.json")),
	);
	const legacyManifest = await realpath(
		fileURLToPath(import.meta.resolve("dumling-old/package.json")),
	);

	expect(replacementManifest).toBe(
		path.join(repositoryRoot, "battery/dumling-new/package.json"),
	);
	expect(legacyManifest).toBe(
		path.join(repositoryRoot, "battery/dumling-old/package.json"),
	);
	expect(replacementManifest).not.toBe(legacyManifest);

	const replacement = await import("dumling");
	const legacy = await import("dumling-old");
	expect(typeof replacement.parseUnit).toBe("function");
	expect(typeof legacy.dumling).toBe("object");
});
