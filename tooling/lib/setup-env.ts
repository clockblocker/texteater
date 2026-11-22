import { existsSync } from "node:fs";
import { chmod, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type SetupKeyName = "TYPESAFE_API_KEY" | "OPENAI_API_KEY";

interface SetupKeySpec {
	readonly envVar: SetupKeyName;
	readonly label: string;
}

const SETUP_KEYS: readonly SetupKeySpec[] = [
	{ envVar: "TYPESAFE_API_KEY", label: "Jev (TypeSafe) API key" },
	{ envVar: "OPENAI_API_KEY", label: "OpenAI API key" },
];

const LOCAL_CONVEX_FLAGS = [
	"TF_DEMO_ADMIN",
	"TF_INSPECTION",
	"TF_KNOWLEDGE_PRODUCTION",
] as const;

type KeySourceKind = "shell" | "appEnvFile" | "rootEnvFile" | "zsh";

export interface ExistingKey {
	readonly value: string;
	readonly origin: string;
	readonly sourceKind: KeySourceKind;
}

export interface SetupPrompter {
	readonly confirm: (
		question: string,
		defaultYes: boolean,
	) => Promise<boolean>;
	readonly secret: (prompt: string) => Promise<string>;
	readonly info: (message: string) => void;
}

export interface CommandInvocation {
	readonly command: readonly string[];
	readonly cwd: string;
	readonly env?: Record<string, string | undefined>;
	readonly stdin?: string;
}

interface CommandResult {
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
}

type CommandRunner = (invocation: CommandInvocation) => Promise<CommandResult>;

export interface RunSetupOptions {
	readonly repositoryRoot: string;
	readonly prompter: SetupPrompter;
	readonly shellEnv?: Readonly<Record<string, string | undefined>>;
	readonly readZshExports?: (
		names: readonly SetupKeyName[],
	) => Promise<Partial<Record<SetupKeyName, string>>>;
	readonly runCommand?: CommandRunner;
}

export interface RunSetupResult {
	readonly envFilePath: string;
	readonly keys: Record<SetupKeyName, { readonly reused: boolean }>;
	readonly shellOverrideWarnings: readonly SetupKeyName[];
}

const ENV_LINE_PATTERN = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/u;
const UNQUOTED_SAFE_PATTERN = /^[A-Za-z0-9._:@/+-]+$/u;
const ZSH_MARKER = "__tf_setup_env__";

function decodeDoubleQuoted(raw: string): string {
	let result = "";
	for (let index = 0; index < raw.length; index += 1) {
		const char = raw[index];
		if (char === "\\" && index + 1 < raw.length) {
			const next = raw[index + 1];
			index += 1;
			switch (next) {
				case "n":
					result += "\n";
					break;
				case "r":
					result += "\r";
					break;
				case "t":
					result += "\t";
					break;
				default:
					result += next ?? "";
					break;
			}
			continue;
		}
		result += char ?? "";
	}
	return result;
}

function parseRawEnvValue(rawValue: string): string {
	const trimmed = rawValue.trim();
	if (trimmed.length === 0) return "";
	if (
		trimmed.startsWith('"') &&
		trimmed.endsWith('"') &&
		trimmed.length >= 2
	) {
		return decodeDoubleQuoted(trimmed.slice(1, -1));
	}
	if (
		trimmed.startsWith("'") &&
		trimmed.endsWith("'") &&
		trimmed.length >= 2
	) {
		return trimmed.slice(1, -1);
	}
	// Strip an inline comment only when preceded by whitespace.
	const commentIndex = trimmed.search(/\s+#/u);
	return (
		commentIndex === -1 ? trimmed : trimmed.slice(0, commentIndex)
	).trim();
}

/** Parses KEY=VALUE assignments from a `.env` file without executing shell code. */
export function parseEnvFile(content: string): Record<string, string> {
	const values: Record<string, string> = {};
	for (const line of content.split(/\r?\n/u)) {
		const trimmed = line.trim();
		if (trimmed === "" || trimmed.startsWith("#")) continue;
		const match = ENV_LINE_PATTERN.exec(line);
		if (!match) continue;
		const [, key, rawValue] = match;
		if (!key || rawValue === undefined) continue;
		values[key] = parseRawEnvValue(rawValue);
	}
	return values;
}

/**
 * Formats an env value so both POSIX `sh` sourcing (`sync-convex-env.sh`) and
 * Bun's `.env` loader read back the exact string.
 */
export function formatEnvValue(value: string): string {
	if (UNQUOTED_SAFE_PATTERN.test(value)) return value;
	if (
		!value.includes("'") &&
		!value.includes("\n") &&
		!value.includes("\r")
	) {
		return `'${value}'`;
	}
	const escaped = value
		.replace(/\\/gu, "\\\\")
		.replace(/"/gu, '\\"')
		.replace(/\$/gu, "\\$")
		.replace(/`/gu, "\\`")
		.replace(/\n/gu, "\\n")
		.replace(/\r/gu, "\\r");
	return `"${escaped}"`;
}

/** Updates or appends `updates` in `.env` content while preserving other lines. */
export function upsertEnvFileContent(
	existingContent: string,
	updates: Readonly<Record<string, string>>,
): string {
	const updateEntries = Object.entries(updates);
	if (updateEntries.length === 0) return existingContent;

	const lines =
		existingContent.length === 0 ? [] : existingContent.split(/\r?\n/u);
	if (lines.length > 0 && lines[lines.length - 1] === "") {
		lines.pop();
	}

	const written = new Set<string>();
	const nextLines: string[] = [];

	for (const line of lines) {
		const match = ENV_LINE_PATTERN.exec(line);
		const key = match?.[1];
		if (key && key in updates) {
			if (!written.has(key)) {
				const value = updates[key];
				if (value !== undefined) {
					nextLines.push(`${key}=${formatEnvValue(value)}`);
				}
				written.add(key);
			}
			continue;
		}
		nextLines.push(line);
	}

	for (const [key, value] of updateEntries) {
		if (!written.has(key)) {
			nextLines.push(`${key}=${formatEnvValue(value)}`);
		}
	}

	return `${nextLines.join("\n")}\n`;
}

/** Removes assignments for `keys` from `.env` content while preserving other lines. */
export function removeEnvKeysFromContent(
	existingContent: string,
	keys: readonly string[],
): string {
	if (existingContent.length === 0 || keys.length === 0)
		return existingContent;
	const removeSet = new Set(keys);
	const hadTrailingNewline = existingContent.endsWith("\n");
	const lines = existingContent.split(/\r?\n/u);
	if (hadTrailingNewline && lines[lines.length - 1] === "") {
		lines.pop();
	}
	const kept = lines.filter((line) => {
		const key = ENV_LINE_PATTERN.exec(line)?.[1];
		return !key || !removeSet.has(key);
	});
	if (kept.length === 0) return "";
	return `${kept.join("\n")}\n`;
}

/** Reads key exports from a zsh login shell without leaking startup output. */
async function defaultReadZshExports(
	names: readonly SetupKeyName[],
): Promise<Partial<Record<SetupKeyName, string>>> {
	const zsh = Bun.which("zsh");
	if (!zsh) return {};
	const child = Bun.spawn(
		[
			zsh,
			"-lic",
			`for name in "$@"; do print -r -- "${ZSH_MARKER} $name=$(printenv "$name")"; done`,
			"zsh",
			...names,
		],
		{
			stdin: "ignore",
			stdout: "pipe",
			stderr: "ignore",
		},
	);
	const [stdout] = await Promise.all([
		new Response(child.stdout).text(),
		child.exited,
	]);
	const found: Partial<Record<SetupKeyName, string>> = {};
	for (const line of stdout.split(/\r?\n/u)) {
		const markerIndex = line.indexOf(`${ZSH_MARKER} `);
		if (markerIndex === -1) continue;
		const rest = line.slice(markerIndex + ZSH_MARKER.length + 1);
		const equalsIndex = rest.indexOf("=");
		if (equalsIndex === -1) continue;
		const name = rest.slice(0, equalsIndex) as SetupKeyName;
		const value = rest.slice(equalsIndex + 1);
		if (names.includes(name) && value.length > 0) {
			found[name] = value;
		}
	}
	return found;
}

async function defaultCommandRunner(
	invocation: CommandInvocation,
): Promise<CommandResult> {
	const child = Bun.spawn([...invocation.command], {
		cwd: invocation.cwd,
		env: invocation.env,
		stdin:
			invocation.stdin !== undefined
				? new TextEncoder().encode(invocation.stdin)
				: "ignore",
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	return { exitCode, stdout, stderr };
}

async function readEnvFileIfPresent(path: string): Promise<{
	readonly exists: boolean;
	readonly content: string;
	readonly values: Record<string, string>;
}> {
	if (!existsSync(path)) {
		return { exists: false, content: "", values: {} };
	}
	const content = await readFile(path, "utf8");
	return { exists: true, content, values: parseEnvFile(content) };
}

export interface LookupContext {
	readonly shellEnv: Readonly<Record<string, string | undefined>>;
	readonly appEnv: Readonly<Record<string, string>>;
	readonly rootEnv: Readonly<Record<string, string>>;
	readonly getZshExports: () => Promise<
		Partial<Record<SetupKeyName, string>>
	>;
}

/**
 * Finds the active existing value for `key`, matching the lookup order of
 * `app/tf-demo/tooling/sync-convex-env.sh`: shell, `app/tf-demo/.env.local`,
 * root `.env.local`, then a zsh login shell.
 */
export async function findExistingKey(
	key: SetupKeyName,
	context: LookupContext,
): Promise<ExistingKey | undefined> {
	const fromShell = context.shellEnv[key]?.trim();
	if (fromShell) {
		return {
			value: fromShell,
			origin: "your shell environment",
			sourceKind: "shell",
		};
	}
	const fromApp = context.appEnv[key]?.trim();
	if (fromApp) {
		return {
			value: fromApp,
			origin: "app/tf-demo/.env.local",
			sourceKind: "appEnvFile",
		};
	}
	const fromRoot = context.rootEnv[key]?.trim();
	if (fromRoot) {
		return {
			value: fromRoot,
			origin: ".env.local",
			sourceKind: "rootEnvFile",
		};
	}
	const zshValues = await context.getZshExports();
	const fromZsh = zshValues[key]?.trim();
	if (fromZsh) {
		return {
			value: fromZsh,
			origin: "your zsh login shell (~/.zshrc)",
			sourceKind: "zsh",
		};
	}
	return undefined;
}

async function promptForNonEmptySecret(
	prompter: SetupPrompter,
	key: SetupKeySpec,
): Promise<string> {
	for (;;) {
		const raw = await prompter.secret(
			`Enter ${key.label} (${key.envVar}): `,
		);
		const value = raw.trim();
		if (value.length > 0) return value;
		prompter.info(
			`${key.envVar} cannot be empty. Please enter a value (or press Ctrl+C to cancel).`,
		);
	}
}

async function resolveKeyValue(
	key: SetupKeySpec,
	lookup: LookupContext,
	prompter: SetupPrompter,
): Promise<{
	readonly value: string;
	readonly reused: boolean;
	readonly replacedShellValue: boolean;
}> {
	const existing = await findExistingKey(key.envVar, lookup);
	if (existing) {
		const reuse = await prompter.confirm(
			`Found existing ${key.label} (${key.envVar}) in ${existing.origin}. Do you want to reuse it?`,
			true,
		);
		if (reuse) {
			return {
				value: existing.value,
				reused: true,
				replacedShellValue: false,
			};
		}
		const replacement = await promptForNonEmptySecret(prompter, key);
		return {
			value: replacement,
			reused: false,
			replacedShellValue:
				existing.sourceKind === "shell" &&
				replacement !== existing.value,
		};
	}
	const entered = await promptForNonEmptySecret(prompter, key);
	return {
		value: entered,
		reused: false,
		replacedShellValue: false,
	};
}

function buildConvexCommandEnv(
	repositoryRoot: string,
	baseEnv: Readonly<Record<string, string | undefined>>,
): Record<string, string | undefined> {
	const nodeBinDir = join(repositoryRoot, "node_modules", "node", "bin");
	const currentPath = baseEnv.PATH ?? "";
	return {
		...baseEnv,
		CONVEX_AGENT_MODE: "anonymous",
		PATH: existsSync(nodeBinDir)
			? `${nodeBinDir}:${currentPath}`
			: currentPath,
	};
}

function formatCommandFailure(label: string, result: CommandResult): Error {
	const detail = (result.stderr || result.stdout).trim();
	return new Error(
		detail.length > 0
			? `${label} failed (exit ${result.exitCode}):\n${detail}`
			: `${label} failed with exit code ${result.exitCode}.`,
	);
}

async function ensureDependenciesInstalled(
	repositoryRoot: string,
	convexEntry: string,
	env: Record<string, string | undefined>,
	prompter: SetupPrompter,
	runCommand: CommandRunner,
): Promise<void> {
	if (existsSync(convexEntry)) return;
	prompter.info("Installing workspace dependencies (`bun install`)...");
	const installResult = await runCommand({
		command: [process.execPath, "install"],
		cwd: repositoryRoot,
		env,
	});
	if (installResult.exitCode !== 0) {
		throw formatCommandFailure("bun install", installResult);
	}
}

async function syncLocalConvexDeployment(options: {
	readonly repositoryRoot: string;
	readonly appDir: string;
	readonly keyValues: Readonly<Record<SetupKeyName, string>>;
	readonly baseEnv: Readonly<Record<string, string | undefined>>;
	readonly prompter: SetupPrompter;
	readonly runCommand: CommandRunner;
}): Promise<void> {
	const convexEntry = join(
		options.repositoryRoot,
		"node_modules",
		"convex",
		"bin",
		"main.js",
	);
	await ensureDependenciesInstalled(
		options.repositoryRoot,
		convexEntry,
		{ ...options.baseEnv },
		options.prompter,
		options.runCommand,
	);

	const pinnedNode = join(
		options.repositoryRoot,
		"node_modules",
		"node",
		"bin",
		"node",
	);
	const nodeExecutable = existsSync(pinnedNode) ? pinnedNode : "node";
	const convexEnv = buildConvexCommandEnv(
		options.repositoryRoot,
		options.baseEnv,
	);

	options.prompter.info(
		"Initializing local Convex deployment for tf-demo...",
	);
	const initResult = await options.runCommand({
		command: [nodeExecutable, convexEntry, "init"],
		cwd: options.appDir,
		env: convexEnv,
	});
	if (initResult.exitCode !== 0) {
		throw formatCommandFailure("convex init", initResult);
	}

	for (const key of SETUP_KEYS) {
		options.prompter.info(
			`Setting ${key.envVar} on local Convex deployment...`,
		);
		const setResult = await options.runCommand({
			command: [nodeExecutable, convexEntry, "env", "set", key.envVar],
			cwd: options.appDir,
			env: convexEnv,
			stdin: options.keyValues[key.envVar],
		});
		if (setResult.exitCode !== 0) {
			throw formatCommandFailure(
				`convex env set ${key.envVar}`,
				setResult,
			);
		}
	}

	for (const flag of LOCAL_CONVEX_FLAGS) {
		const flagResult = await options.runCommand({
			command: [nodeExecutable, convexEntry, "env", "set", flag, "1"],
			cwd: options.appDir,
			env: convexEnv,
		});
		if (flagResult.exitCode !== 0) {
			throw formatCommandFailure(`convex env set ${flag}`, flagResult);
		}
	}
}

/**
 * Interactive setup workflow: resolves `TYPESAFE_API_KEY` and `OPENAI_API_KEY`
 * (reusing existing values when confirmed), writes them alongside
 * `TF_KNOWLEDGE_PRODUCTION=1` to the repository root `.env.local`, clears
 * stale overrides from `app/tf-demo/.env.local`, ensures dependencies are
 * installed, initializes the local Convex deployment, and syncs both keys
 * plus local dev flags into Convex.
 */
export async function runSetup(
	options: RunSetupOptions,
): Promise<RunSetupResult> {
	const { repositoryRoot, prompter } = options;
	const shellEnv = options.shellEnv ?? process.env;
	const readZshExports = options.readZshExports ?? defaultReadZshExports;
	const runCommand = options.runCommand ?? defaultCommandRunner;

	const rootEnvPath = join(repositoryRoot, ".env.local");
	const appDir = join(repositoryRoot, "app", "tf-demo");
	const appEnvPath = join(appDir, ".env.local");

	const [rootEnvFile, appEnvFile] = await Promise.all([
		readEnvFileIfPresent(rootEnvPath),
		readEnvFileIfPresent(appEnvPath),
	]);

	let zshCache: Promise<Partial<Record<SetupKeyName, string>>> | undefined;
	const lookup: LookupContext = {
		shellEnv,
		appEnv: appEnvFile.values,
		rootEnv: rootEnvFile.values,
		getZshExports: () => {
			if (!zshCache) {
				zshCache = readZshExports(
					SETUP_KEYS.map((spec) => spec.envVar),
				);
			}
			return zshCache;
		},
	};

	const resolvedValues = {} as Record<SetupKeyName, string>;
	const keySummary = {} as Record<SetupKeyName, { readonly reused: boolean }>;
	const shellOverrideWarnings: SetupKeyName[] = [];

	for (const key of SETUP_KEYS) {
		const resolved = await resolveKeyValue(key, lookup, prompter);
		resolvedValues[key.envVar] = resolved.value;
		keySummary[key.envVar] = { reused: resolved.reused };
		if (resolved.replacedShellValue) {
			shellOverrideWarnings.push(key.envVar);
		}
	}

	const nextRootContent = upsertEnvFileContent(rootEnvFile.content, {
		...resolvedValues,
		TF_KNOWLEDGE_PRODUCTION: "1",
	});
	await writeFile(rootEnvPath, nextRootContent, { encoding: "utf8" });
	if (!rootEnvFile.exists) {
		await chmod(rootEnvPath, 0o600);
	}
	prompter.info("Saved keys and TF_KNOWLEDGE_PRODUCTION=1 to .env.local.");

	// Clear any conflicting copies in app/tf-demo/.env.local so root .env.local
	// is never shadowed during `bun run env:sync`.
	const staleAppKeys = SETUP_KEYS.map((spec) => spec.envVar).filter(
		(name) =>
			name in appEnvFile.values &&
			appEnvFile.values[name] !== resolvedValues[name],
	);
	if (appEnvFile.exists && staleAppKeys.length > 0) {
		const cleanedAppContent = removeEnvKeysFromContent(
			appEnvFile.content,
			staleAppKeys,
		);
		await writeFile(appEnvPath, cleanedAppContent, { encoding: "utf8" });
		prompter.info(
			`Removed stale ${staleAppKeys.join(", ")} override(s) from app/tf-demo/.env.local.`,
		);
	}

	await syncLocalConvexDeployment({
		repositoryRoot,
		appDir,
		keyValues: resolvedValues,
		baseEnv: shellEnv,
		prompter,
		runCommand,
	});

	if (shellOverrideWarnings.length > 0) {
		prompter.info(
			`Note: your current shell still exports ${shellOverrideWarnings.join(", ")}. Run \`unset ${shellOverrideWarnings.join(" ")}\` before starting \`bun run demo\` so the saved .env.local values take precedence.`,
		);
	}

	prompter.info(
		"Setup complete. Run `bun run demo` to start tf-demo (restart it if it is already running).",
	);

	return {
		envFilePath: rootEnvPath,
		keys: keySummary,
		shellOverrideWarnings,
	};
}
