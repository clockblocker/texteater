import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type CommandInvocation,
	findExistingKey,
	formatEnvValue,
	parseEnvFile,
	removeEnvKeysFromContent,
	runSetup,
	type SetupKeyName,
	type SetupPrompter,
	upsertEnvFileContent,
} from "../lib/setup-env";

let scratch: string | undefined;

afterEach(async () => {
	if (scratch) {
		await rm(scratch, { recursive: true, force: true });
		scratch = undefined;
	}
});

async function createScratchRepo(options?: {
	readonly rootEnv?: string;
	readonly appEnv?: string;
	readonly withConvexInstalled?: boolean;
}): Promise<string> {
	scratch = await mkdtemp(join(tmpdir(), "texteater-setup-test-"));
	const appDir = join(scratch, "app", "tf-demo");
	await mkdir(appDir, { recursive: true });
	if (options?.withConvexInstalled !== false) {
		const convexBinDir = join(scratch, "node_modules", "convex", "bin");
		await mkdir(convexBinDir, { recursive: true });
		await writeFile(join(convexBinDir, "main.js"), "// stub\n");
	}
	if (options?.rootEnv !== undefined) {
		await writeFile(join(scratch, ".env.local"), options.rootEnv);
	}
	if (options?.appEnv !== undefined) {
		await writeFile(join(appDir, ".env.local"), options.appEnv);
	}
	return scratch;
}

function createFakePrompter(options: {
	readonly confirms?: readonly boolean[];
	readonly secrets?: readonly string[];
}): {
	readonly prompter: SetupPrompter;
	readonly confirmQuestions: string[];
	readonly secretPrompts: string[];
	readonly infos: string[];
} {
	const confirms = [...(options.confirms ?? [])];
	const secrets = [...(options.secrets ?? [])];
	const confirmQuestions: string[] = [];
	const secretPrompts: string[] = [];
	const infos: string[] = [];

	return {
		confirmQuestions,
		secretPrompts,
		infos,
		prompter: {
			async confirm(question) {
				confirmQuestions.push(question);
				const next = confirms.shift();
				if (next === undefined) {
					throw new Error(`Unexpected confirm prompt: ${question}`);
				}
				return next;
			},
			async secret(prompt) {
				secretPrompts.push(prompt);
				const next = secrets.shift();
				if (next === undefined) {
					throw new Error(`Unexpected secret prompt: ${prompt}`);
				}
				return next;
			},
			info(message) {
				infos.push(message);
			},
		},
	};
}

test("parseEnvFile handles export prefix, quotes, comments, and blank lines", () => {
	const parsed = parseEnvFile(
		[
			"# comment",
			"",
			"TYPESAFE_API_KEY=ts-plain-123",
			'export OPENAI_API_KEY="sk-double-$1"',
			"SINGLE='single # not comment'",
			"TRAILING=abc123 # inline comment",
		].join("\n"),
	);
	expect(parsed).toEqual({
		TYPESAFE_API_KEY: "ts-plain-123",
		OPENAI_API_KEY: "sk-double-$1",
		SINGLE: "single # not comment",
		TRAILING: "abc123",
	});
});

test("formatEnvValue round-trips through parseEnvFile and POSIX sh", async () => {
	const values = [
		"sk-proj-abc_123.XYZ",
		"key with spaces # hash $var",
		"key'with'single$quotes",
	];
	for (const value of values) {
		const formatted = formatEnvValue(value);
		expect(parseEnvFile(`SAMPLE=${formatted}\n`).SAMPLE).toBe(value);

		const child = Bun.spawn(
			["sh", "-c", `SAMPLE=${formatted}; printf '%s' "$SAMPLE"`],
			{ stdout: "pipe", stderr: "pipe" },
		);
		const [shValue, exitCode] = await Promise.all([
			new Response(child.stdout).text(),
			child.exited,
		]);
		expect(exitCode).toBe(0);
		expect(shValue).toBe(value);
	}
});

test("upsertEnvFileContent updates keys in place, deduplicates, and preserves comments", () => {
	const initial = [
		"# Local secrets",
		"OTHER_VAR=keep-me",
		"TYPESAFE_API_KEY=old-jev",
		"TYPESAFE_API_KEY=duplicate-jev",
		"",
	].join("\n");

	const updated = upsertEnvFileContent(initial, {
		TYPESAFE_API_KEY: "new-jev",
		OPENAI_API_KEY: "new-openai",
	});

	expect(updated).toBe(
		[
			"# Local secrets",
			"OTHER_VAR=keep-me",
			"TYPESAFE_API_KEY=new-jev",
			"OPENAI_API_KEY=new-openai",
			"",
		].join("\n"),
	);
});

test("removeEnvKeysFromContent drops only targeted keys", () => {
	const initial = [
		"CONVEX_DEPLOYMENT=anonymous:local",
		"TYPESAFE_API_KEY=stale-jev",
		"VITE_CONVEX_URL=http://127.0.0.1:3210",
		"",
	].join("\n");

	expect(removeEnvKeysFromContent(initial, ["TYPESAFE_API_KEY"])).toBe(
		[
			"CONVEX_DEPLOYMENT=anonymous:local",
			"VITE_CONVEX_URL=http://127.0.0.1:3210",
			"",
		].join("\n"),
	);
});

test("findExistingKey follows shell -> app env -> root env -> zsh precedence", async () => {
	const zsh = async () => ({ TYPESAFE_API_KEY: "from-zsh" });

	expect(
		await findExistingKey("TYPESAFE_API_KEY", {
			shellEnv: { TYPESAFE_API_KEY: "from-shell" },
			appEnv: { TYPESAFE_API_KEY: "from-app" },
			rootEnv: { TYPESAFE_API_KEY: "from-root" },
			getZshExports: zsh,
		}),
	).toMatchObject({ value: "from-shell", sourceKind: "shell" });

	expect(
		await findExistingKey("TYPESAFE_API_KEY", {
			shellEnv: {},
			appEnv: { TYPESAFE_API_KEY: "from-app" },
			rootEnv: { TYPESAFE_API_KEY: "from-root" },
			getZshExports: zsh,
		}),
	).toMatchObject({ value: "from-app", sourceKind: "appEnvFile" });

	expect(
		await findExistingKey("TYPESAFE_API_KEY", {
			shellEnv: {},
			appEnv: {},
			rootEnv: { TYPESAFE_API_KEY: "from-root" },
			getZshExports: zsh,
		}),
	).toMatchObject({ value: "from-root", sourceKind: "rootEnvFile" });

	expect(
		await findExistingKey("TYPESAFE_API_KEY", {
			shellEnv: {},
			appEnv: {},
			rootEnv: {},
			getZshExports: zsh,
		}),
	).toMatchObject({ value: "from-zsh", sourceKind: "zsh" });
});

test("runSetup prompts for both keys on a fresh checkout, saves .env.local, and syncs Convex", async () => {
	const root = await createScratchRepo();
	const fake = createFakePrompter({
		secrets: ["", "ts-fresh-secret", "sk-fresh-openai"],
	});
	const commands: CommandInvocation[] = [];

	const result = await runSetup({
		repositoryRoot: root,
		prompter: fake.prompter,
		shellEnv: {},
		readZshExports: async () => ({}),
		runCommand: async (invocation) => {
			commands.push(invocation);
			return { exitCode: 0, stdout: "", stderr: "" };
		},
	});

	expect(fake.confirmQuestions).toEqual([]);
	expect(fake.secretPrompts).toHaveLength(3);
	expect(result.keys).toEqual({
		TYPESAFE_API_KEY: { reused: false },
		OPENAI_API_KEY: { reused: false },
	});
	expect(result.shellOverrideWarnings).toEqual([]);

	const savedEnv = parseEnvFile(
		await readFile(join(root, ".env.local"), "utf8"),
	);
	expect(savedEnv).toEqual({
		TYPESAFE_API_KEY: "ts-fresh-secret",
		OPENAI_API_KEY: "sk-fresh-openai",
	});

	// Verify Convex commands: init, set TYPESAFE_API_KEY, set OPENAI_API_KEY, set local flags.
	expect(commands.map((entry) => entry.command.slice(2))).toEqual([
		["init"],
		["env", "set", "TYPESAFE_API_KEY"],
		["env", "set", "OPENAI_API_KEY"],
		["env", "set", "TF_DEMO_ADMIN", "1"],
		["env", "set", "TF_INSPECTION", "1"],
	]);
	expect(commands[1]?.stdin).toBe("ts-fresh-secret");
	expect(commands[2]?.stdin).toBe("sk-fresh-openai");

	// Secrets must never appear in info logs or CLI argv.
	const allOutput = fake.infos.join("\n");
	const allArgv = commands.flatMap((entry) => entry.command).join(" ");
	expect(allOutput).not.toContain("ts-fresh-secret");
	expect(allOutput).not.toContain("sk-fresh-openai");
	expect(allArgv).not.toContain("ts-fresh-secret");
	expect(allArgv).not.toContain("sk-fresh-openai");
});

test("runSetup asks to reuse existing keys and keeps them when confirmed", async () => {
	const root = await createScratchRepo({
		rootEnv: "TYPESAFE_API_KEY=ts-existing\n",
	});
	const fake = createFakePrompter({
		confirms: [true, true],
	});
	const commands: CommandInvocation[] = [];

	const result = await runSetup({
		repositoryRoot: root,
		prompter: fake.prompter,
		shellEnv: {},
		readZshExports: async () => ({ OPENAI_API_KEY: "sk-from-zsh" }),
		runCommand: async (invocation) => {
			commands.push(invocation);
			return { exitCode: 0, stdout: "", stderr: "" };
		},
	});

	expect(fake.confirmQuestions).toHaveLength(2);
	expect(fake.confirmQuestions[0]).toContain("TYPESAFE_API_KEY");
	expect(fake.confirmQuestions[0]).toContain(".env.local");
	expect(fake.confirmQuestions[1]).toContain("OPENAI_API_KEY");
	expect(fake.confirmQuestions[1]).toContain("zsh");
	expect(fake.secretPrompts).toEqual([]);
	expect(result.keys).toEqual({
		TYPESAFE_API_KEY: { reused: true },
		OPENAI_API_KEY: { reused: true },
	});

	const savedEnv = parseEnvFile(
		await readFile(join(root, ".env.local"), "utf8"),
	);
	expect(savedEnv).toEqual({
		TYPESAFE_API_KEY: "ts-existing",
		OPENAI_API_KEY: "sk-from-zsh",
	});
	expect(commands[1]?.stdin).toBe("ts-existing");
	expect(commands[2]?.stdin).toBe("sk-from-zsh");
});

test("runSetup replaces declined keys, clears stale app env overrides, and warns about shell exports", async () => {
	const root = await createScratchRepo({
		rootEnv: "EXISTING_OTHER=1\nTYPESAFE_API_KEY=old-root-jev\n",
		appEnv: [
			"CONVEX_DEPLOYMENT=anonymous:fixture",
			"OPENAI_API_KEY=stale-app-openai",
			"",
		].join("\n"),
	});
	const fake = createFakePrompter({
		confirms: [false, false],
		secrets: ["ts-replacement", "sk-replacement"],
	});
	const commands: CommandInvocation[] = [];

	const result = await runSetup({
		repositoryRoot: root,
		prompter: fake.prompter,
		shellEnv: { TYPESAFE_API_KEY: "old-shell-jev" },
		readZshExports: async () => ({}),
		runCommand: async (invocation) => {
			commands.push(invocation);
			return { exitCode: 0, stdout: "", stderr: "" };
		},
	});

	expect(result.keys).toEqual({
		TYPESAFE_API_KEY: { reused: false },
		OPENAI_API_KEY: { reused: false },
	});
	expect(result.shellOverrideWarnings).toEqual(["TYPESAFE_API_KEY"]);

	const savedRoot = parseEnvFile(
		await readFile(join(root, ".env.local"), "utf8"),
	);
	expect(savedRoot).toEqual({
		EXISTING_OTHER: "1",
		TYPESAFE_API_KEY: "ts-replacement",
		OPENAI_API_KEY: "sk-replacement",
	});

	const savedApp = parseEnvFile(
		await readFile(join(root, "app", "tf-demo", ".env.local"), "utf8"),
	);
	expect(savedApp).toEqual({
		CONVEX_DEPLOYMENT: "anonymous:fixture",
	});

	expect(commands[1]?.stdin).toBe("ts-replacement");
	expect(commands[2]?.stdin).toBe("sk-replacement");
	expect(
		fake.infos.some((line) => line.includes("unset TYPESAFE_API_KEY")),
	).toBe(true);
});

test("runSetup runs bun install first when dependencies are missing", async () => {
	const root = await createScratchRepo({ withConvexInstalled: false });
	const fake = createFakePrompter({
		secrets: ["ts-key", "sk-key"],
	});
	const commands: CommandInvocation[] = [];
	const expectedKeys: readonly SetupKeyName[] = [
		"TYPESAFE_API_KEY",
		"OPENAI_API_KEY",
	];

	const result = await runSetup({
		repositoryRoot: root,
		prompter: fake.prompter,
		shellEnv: {},
		readZshExports: async () => ({}),
		runCommand: async (invocation) => {
			commands.push(invocation);
			return { exitCode: 0, stdout: "", stderr: "" };
		},
	});

	expect(Object.keys(result.keys)).toEqual([...expectedKeys]);
	expect(commands[0]?.command[1]).toBe("install");
	expect(commands[0]?.cwd).toBe(root);
	expect(commands[1]?.command.slice(2)).toEqual(["init"]);
});

test("tooling/setup.ts CLI runs interactively over piped stdin and syncs to convex", async () => {
	const root = await createScratchRepo({
		rootEnv: "TYPESAFE_API_KEY=ts-existing-cli\n",
	});
	const setupScript = join(import.meta.dir, "..", "setup.ts");
	const logPath = join(root, "convex-calls.log");
	await writeFile(
		join(root, "package.json"),
		JSON.stringify({
			name: "scratch",
			private: true,
			workspaces: ["app/*"],
		}),
	);
	await writeFile(
		join(root, "node_modules", "convex", "bin", "main.js"),
		[
			'const fs = require("node:fs");',
			'const args = process.argv.slice(2).join(" ");',
			'let stdin = "";',
			'process.stdin.setEncoding("utf8");',
			'process.stdin.on("data", (c) => { stdin += c; });',
			'process.stdin.on("end", () => {',
			`  fs.appendFileSync(${JSON.stringify(logPath)}, args + "|" + stdin + "\\n");`,
			"});",
			"process.stdin.resume();",
		].join("\n"),
	);

	const {
		TYPESAFE_API_KEY: _jev,
		OPENAI_API_KEY: _openai,
		...cleanEnv
	} = process.env;
	const child = Bun.spawn([process.execPath, setupScript], {
		cwd: root,
		env: {
			...cleanEnv,
			HOME: root,
			ZDOTDIR: root,
		},
		stdin: new TextEncoder().encode("y\nsk-cli-entered\n"),
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);

	expect(exitCode).toBe(0);
	expect(stderr).toBe("");
	expect(stdout).toContain("Found existing Jev (TypeSafe) API key");
	expect(stdout).toContain("Do you want to reuse it?");
	expect(stdout).toContain("Enter OpenAI API key (OPENAI_API_KEY):");
	expect(stdout).not.toContain("ts-existing-cli");
	expect(stdout).not.toContain("sk-cli-entered");

	const savedEnv = parseEnvFile(
		await readFile(join(root, ".env.local"), "utf8"),
	);
	expect(savedEnv).toEqual({
		TYPESAFE_API_KEY: "ts-existing-cli",
		OPENAI_API_KEY: "sk-cli-entered",
	});

	const calls = (await readFile(logPath, "utf8")).trim().split("\n");
	expect(calls).toEqual([
		"init|",
		"env set TYPESAFE_API_KEY|ts-existing-cli",
		"env set OPENAI_API_KEY|sk-cli-entered",
		"env set TF_DEMO_ADMIN 1|",
		"env set TF_INSPECTION 1|",
	]);
});
