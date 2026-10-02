import { afterEach, expect, test } from "bun:test";
import {
	chmod,
	mkdir,
	mkdtemp,
	readdir,
	readFile,
	rm,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

/**
 * `tooling/sync-convex-env.sh` pushes the keys the deployment reads, each
 * from the first place that sets it. The precedence runs in a scratch tree
 * with a fake key name and a stubbed `npx`, so no test reads a real key or
 * reaches a deployment.
 */

const packageDirectory = dirname(import.meta.dir);
const scriptPath = join(packageDirectory, "tooling", "sync-convex-env.sh");
/** Variables Convex itself provides; nothing syncs them. */
const PLATFORM_VARIABLES = new Set(["CONVEX_CLOUD_URL", "CONVEX_SITE_URL"]);

/** The space-separated names the script assigns to `list`. */
function scriptList(script: string, list: string): string[] {
	const names = new RegExp(`^${list}="([^"]*)"$`, "mu").exec(script)?.[1];
	if (names === undefined)
		throw new Error(`sync-convex-env.sh assigns no ${list}.`);
	return names.split(/\s+/u).filter(Boolean);
}

/**
 * Every variable the code that runs in the deployment declares or reads:
 * `convex.config.ts` declarations, and `env.NAME` or `process.env.NAME` in
 * convex/, server/ and shared/.
 */
async function variablesTheDeploymentReads(): Promise<string[]> {
	const names = new Set<string>();
	const config = await readFile(
		join(packageDirectory, "convex", "convex.config.ts"),
		"utf8",
	);
	for (const [, name] of config.matchAll(/\b([A-Z][A-Z0-9_]*)\s*:\s*v\./gu))
		if (name) names.add(name);
	for (const directory of ["convex", "server", "shared"]) {
		const files = await readdir(join(packageDirectory, directory), {
			recursive: true,
		});
		for (const file of files) {
			if (file.startsWith("_generated") || !/\.tsx?$/u.test(file))
				continue;
			const source = await readFile(
				join(packageDirectory, directory, file),
				"utf8",
			);
			for (const [, name] of source.matchAll(
				/(?<!meta\.)\benv\.([A-Z][A-Z0-9_]*)\b/gu,
			))
				if (name) names.add(name);
		}
	}
	return [...names].filter((name) => !PLATFORM_VARIABLES.has(name)).sort();
}

test("the env sync pushes exactly the variables the deployment reads", async () => {
	const script = await readFile(scriptPath, "utf8");
	expect(await variablesTheDeploymentReads()).toEqual(
		[
			...scriptList(script, "provider_keys"),
			...scriptList(script, "local_flags"),
		].sort(),
	);
});

const FAKE_KEY = "TF_DEMO_SYNC_FIXTURE_KEY";
const VALUES = {
	shell: "fixture-value-from-shell",
	appFile: "fixture-value-from-app-file",
	rootFile: "fixture-value-from-root-file",
	zsh: "fixture-value-from-zsh",
} as const;
type Source = keyof typeof VALUES;

let scratch: string | undefined;
afterEach(async () => {
	if (scratch) await rm(scratch, { recursive: true, force: true });
	scratch = undefined;
});

/**
 * Runs a copy of the script that syncs only `FAKE_KEY`, with the key set in
 * `sources`: the shell, `app/demo/.env.local`, the root `.env.local`, and a
 * zsh login shell whose startup files also print noise. Returns its output
 * and what the stubbed `npx` received for the key.
 */
async function runSync(sources: readonly Source[]) {
	scratch = await mkdtemp(join(tmpdir(), "tf-demo-env-sync-"));
	const app = join(scratch, "app", "demo");
	const bin = join(scratch, "bin");
	const home = join(scratch, "home");
	const received = join(scratch, "received");
	await Promise.all([
		mkdir(join(app, "tooling"), { recursive: true }),
		mkdir(bin),
		mkdir(home),
	]);
	const script = (await readFile(scriptPath, "utf8")).replace(
		/^provider_keys=".*"$/mu,
		`provider_keys="${FAKE_KEY}"`,
	);
	const appScript = join(app, "tooling", "sync-convex-env.sh");
	const npx = join(bin, "npx");
	await Promise.all([
		writeFile(appScript, script),
		// `npx convex env set NAME [VALUE] [flags]`; the key's value comes on stdin.
		writeFile(
			npx,
			`#!/bin/sh\nif [ "$4" = "${FAKE_KEY}" ]; then cat > "${received}"; fi\nexit 0\n`,
		),
		writeFile(
			join(app, ".env.local"),
			`CONVEX_DEPLOYMENT=anonymous:fixture\n${
				sources.includes("appFile")
					? `${FAKE_KEY}=${VALUES.appFile}\n`
					: ""
			}`,
		),
		sources.includes("rootFile")
			? writeFile(
					join(scratch, ".env.local"),
					`${FAKE_KEY}="${VALUES.rootFile}"\n`,
				)
			: Promise.resolve(),
		writeFile(
			join(home, ".zshrc"),
			`echo "zshrc noise"\n${
				sources.includes("zsh")
					? `export ${FAKE_KEY}=${VALUES.zsh}\n`
					: ""
			}`,
		),
	]);
	await chmod(npx, 0o755);
	const { [FAKE_KEY]: _inherited, ...inherited } = process.env;
	const child = Bun.spawn(["sh", appScript], {
		cwd: scratch,
		env: {
			...inherited,
			PATH: `${bin}:${process.env.PATH ?? ""}`,
			HOME: home,
			ZDOTDIR: home,
			...(sources.includes("shell") ? { [FAKE_KEY]: VALUES.shell } : {}),
		},
		stdin: "ignore",
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	const pushed = await readFile(received, "utf8").catch(() => undefined);
	return { stdout, stderr, exitCode, pushed };
}

function expectNoValuePrinted(output: { stdout: string; stderr: string }) {
	for (const value of Object.values(VALUES)) {
		expect(output.stdout).not.toContain(value);
		expect(output.stderr).not.toContain(value);
	}
}

const zshInstalled = Bun.which("zsh") !== null;

test.each([
	{
		sources: ["shell", "appFile", "rootFile", "zsh"],
		winner: "shell",
		origin: "the shell",
	},
	{
		sources: ["appFile", "rootFile", "zsh"],
		winner: "appFile",
		origin: "app/tf-demo/.env.local",
	},
	{
		sources: ["rootFile", "zsh"],
		winner: "rootFile",
		origin: "the repository root's .env.local",
	},
] as const)(
	"a key set in $winner and below is pushed from $winner",
	async ({ sources, winner, origin }) => {
		const output = await runSync(sources);
		expect(output.exitCode).toBe(0);
		expect(output.pushed).toBe(VALUES[winner]);
		expect(output.stdout).toContain(`setting ${FAKE_KEY} from ${origin}`);
		expectNoValuePrinted(output);
	},
);

test.skipIf(!zshInstalled)(
	"a key only a zsh login shell exports is pushed from there, past what its startup files print",
	async () => {
		const output = await runSync(["zsh"]);
		expect(output.exitCode).toBe(0);
		expect(output.pushed).toBe(VALUES.zsh);
		expect(output.stdout).toContain(
			`setting ${FAKE_KEY} from a zsh login shell`,
		);
		expectNoValuePrinted(output);
	},
);

test("a key set nowhere is reported loudly while the local flags are still set", async () => {
	const output = await runSync([]);
	expect(output.exitCode).toBe(1);
	expect(output.pushed).toBeUndefined();
	expect(output.stderr).toContain(
		`WARNING: not pushed to the Convex deployment: ${FAKE_KEY}`,
	);
	expect(output.stderr).toContain("the repository root's .env.local");
	expect(output.stdout).toContain("setting TF_DEMO_ADMIN");
	expect(output.stdout).toContain("setting TF_INSPECTION");
});
