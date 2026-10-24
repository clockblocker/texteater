import { expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

const script = join(import.meta.dir, "../file-tokens.ts");
const limitBytes = 5_000 * 4;

async function repository(files: Record<string, string | Uint8Array>) {
	const root = await mkdtemp(join(tmpdir(), "textfresser-file-tokens-"));
	await git(root, "init", "--quiet");
	for (const [path, content] of Object.entries(files)) {
		await mkdir(dirname(join(root, path)), { recursive: true });
		await writeFile(join(root, path), content);
	}
	await git(root, "add", "--all");
	return root;
}

async function git(cwd: string, ...args: string[]) {
	const child = Bun.spawn(["git", ...args], { cwd, stderr: "inherit" });
	expect(await child.exited).toBe(0);
}

async function check(cwd: string) {
	const child = Bun.spawn([process.execPath, script], {
		cwd,
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stderr, exitCode] = await Promise.all([
		new Response(child.stderr).text(),
		child.exited,
	]);
	return { exitCode, stderr };
}

test("a staged file over 5,000 tokens fails; one at the limit passes", async () => {
	const root = await repository({
		"at-limit.ts": "a".repeat(limitBytes),
		"over.ts": "a".repeat(limitBytes + 1),
	});
	try {
		const { exitCode, stderr } = await check(root);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("- over.ts (5,001)");
		expect(stderr).not.toContain("at-limit.ts");
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("generated, vendored and binary files are skipped", async () => {
	const big = "a".repeat(limitBytes + 1);
	const root = await repository({
		".gitattributes":
			"bun.lock linguist-generated\nsrc/generated/** linguist-generated\nvendor/** linguist-vendored\n",
		"bun.lock": big,
		"src/generated/types.ts": big,
		"vendor/guide.md": big,
		"image.png": new Uint8Array(limitBytes + 1),
	});
	try {
		expect(await check(root)).toEqual({ exitCode: 0, stderr: "" });
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("gold records are skipped; other dumcorpus files count", async () => {
	const big = "a".repeat(limitBytes + 1);
	const root = await repository({
		"battery/dumcorpus/records/de/sentence.json": big,
		"battery/dumcorpus/records/breakdown/de/word.json": big,
		"battery/dumcorpus/src/rules.ts": big,
	});
	try {
		const { exitCode, stderr } = await check(root);
		expect(exitCode).toBe(1);
		expect(stderr).toContain("- battery/dumcorpus/src/rules.ts");
		expect(stderr).not.toContain("records/");
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("only the staged content counts", async () => {
	const root = await repository({ "small.ts": "a" });
	try {
		await writeFile(join(root, "small.ts"), "a".repeat(limitBytes + 1));
		await writeFile(join(root, "untracked.ts"), "a".repeat(limitBytes + 1));
		expect((await check(root)).exitCode).toBe(0);

		const identity = [
			"-c",
			"user.name=fixture",
			"-c",
			"user.email=f@x.test",
		];
		await git(
			root,
			...identity,
			"-c",
			"commit.gpgsign=false",
			"commit",
			"-qm",
			"small",
		);
		await git(root, "rm", "--quiet", "--cached", "small.ts");
		expect((await check(root)).exitCode).toBe(0);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});

test("inside a workspace only that workspace's staged files count", async () => {
	const root = await repository({
		"battery/one/index.ts": "a".repeat(limitBytes + 1),
		"battery/two/index.ts": "a",
	});
	try {
		expect((await check(join(root, "battery/two"))).exitCode).toBe(0);
		expect((await check(join(root, "battery/one"))).stderr).toContain(
			"- battery/one/index.ts",
		);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
});
