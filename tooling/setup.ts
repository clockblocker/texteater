/**
 * `bun run setup`: interactive local setup for tf-demo.
 *
 * Prompts for `TYPESAFE_API_KEY` (Jev) and `OPENAI_API_KEY` (OpenAI), offering
 * to reuse existing values when found, saves them with
 * `TF_KNOWLEDGE_PRODUCTION=1` to the repository root's `.env.local`,
 * initializes the local Convex deployment, and pushes both keys and local dev
 * flags into Convex so `bun run demo` works immediately.
 */
import { runSetup, type SetupPrompter } from "./lib/setup-env";
import { findRepositoryRoot } from "./lib/workspaces";

class SetupCancelledError extends Error {
	constructor() {
		super("Setup cancelled.");
	}
}

function createLineQueue() {
	let buffer = "";
	let ended = false;
	const lines: string[] = [];
	const waiters: Array<(line: string | null) => void> = [];
	let attached = false;

	function attach(): void {
		if (attached) return;
		attached = true;
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk: string) => {
			buffer += chunk;
			const parts = buffer.split(/\r?\n/u);
			buffer = parts.pop() ?? "";
			for (const part of parts) {
				const waiter = waiters.shift();
				if (waiter) {
					waiter(part);
				} else {
					lines.push(part);
				}
			}
		});
		process.stdin.on("end", () => {
			ended = true;
			if (buffer.length > 0) {
				const tail = buffer;
				buffer = "";
				const waiter = waiters.shift();
				if (waiter) {
					waiter(tail);
				} else {
					lines.push(tail);
				}
			}
			while (waiters.length > 0) {
				waiters.shift()?.(null);
			}
		});
		process.stdin.resume();
	}

	return {
		async nextLine(): Promise<string> {
			attach();
			const queued = lines.shift();
			if (queued !== undefined) return queued;
			if (ended) throw new SetupCancelledError();
			const line = await new Promise<string | null>((resolve) => {
				waiters.push(resolve);
			});
			if (line === null) throw new SetupCancelledError();
			return line;
		},
	};
}

function stripBracketedPaste(input: string): string {
	return input.replaceAll("\x1b[200~", "").replaceAll("\x1b[201~", "");
}

type MaskedCharOutcome =
	| { readonly kind: "continue"; readonly value: string }
	| { readonly kind: "submit"; readonly value: string }
	| { readonly kind: "cancel" };

function applyMaskedChar(
	char: string,
	value: string,
	stdout: NodeJS.WriteStream,
): MaskedCharOutcome {
	if (char === "\x03") return { kind: "cancel" };
	if (char === "\r" || char === "\n") return { kind: "submit", value };
	if (char === "\x7f" || char === "\b") {
		if (value.length === 0) return { kind: "continue", value };
		stdout.write("\b \b");
		return { kind: "continue", value: value.slice(0, -1) };
	}
	if (char === "\x15") {
		if (value.length > 0) stdout.write("\b \b".repeat(value.length));
		return { kind: "continue", value: "" };
	}
	if (char >= " ") {
		stdout.write("*");
		return { kind: "continue", value: value + char };
	}
	return { kind: "continue", value };
}

function readMaskedLineFromTty(prompt: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const stdin = process.stdin;
		const stdout = process.stdout;
		const wasRaw = Boolean(stdin.isRaw);
		let value = "";

		const cleanup = () => {
			stdin.off("data", onData);
			if (stdin.isTTY) {
				stdin.setRawMode(wasRaw);
			}
			stdin.pause();
		};

		const onData = (chunk: string | Buffer) => {
			const text = stripBracketedPaste(
				typeof chunk === "string" ? chunk : chunk.toString("utf8"),
			);
			for (const char of text) {
				const outcome = applyMaskedChar(char, value, stdout);
				if (outcome.kind === "cancel") {
					cleanup();
					stdout.write("\n");
					reject(new SetupCancelledError());
					return;
				}
				if (outcome.kind === "submit") {
					cleanup();
					stdout.write("\n");
					resolve(outcome.value);
					return;
				}
				value = outcome.value;
			}
		};

		stdout.write(prompt);
		if (stdin.isTTY) {
			stdin.setRawMode(true);
		}
		stdin.resume();
		stdin.on("data", onData);
	});
}

function readPlainLineFromTty(prompt: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const stdin = process.stdin;
		const stdout = process.stdout;
		let buffer = "";

		const cleanup = () => {
			stdin.off("data", onData);
			stdin.off("end", onEnd);
			stdin.pause();
		};

		const onData = (chunk: string | Buffer) => {
			buffer +=
				typeof chunk === "string" ? chunk : chunk.toString("utf8");
			const newlineIndex = buffer.search(/\r?\n/u);
			if (newlineIndex !== -1) {
				const line = buffer.slice(0, newlineIndex);
				cleanup();
				resolve(line);
			}
		};

		const onEnd = () => {
			cleanup();
			if (buffer.length > 0) {
				resolve(buffer);
			} else {
				reject(new SetupCancelledError());
			}
		};

		stdout.write(prompt);
		stdin.resume();
		stdin.on("data", onData);
		stdin.on("end", onEnd);
	});
}

function createTerminalPrompter(): SetupPrompter {
	const pipedQueue = process.stdin.isTTY ? undefined : createLineQueue();

	const readPlain = async (prompt: string): Promise<string> => {
		if (!pipedQueue) {
			return readPlainLineFromTty(prompt);
		}
		process.stdout.write(prompt);
		return pipedQueue.nextLine();
	};

	const readSecret = async (prompt: string): Promise<string> => {
		if (!pipedQueue) {
			return readMaskedLineFromTty(prompt);
		}
		process.stdout.write(prompt);
		return pipedQueue.nextLine();
	};

	return {
		async confirm(question: string, defaultYes: boolean): Promise<boolean> {
			const hint = defaultYes ? "[Y/n]" : "[y/N]";
			for (;;) {
				const answer = (await readPlain(`${question} ${hint}: `))
					.trim()
					.toLowerCase();
				if (answer === "") return defaultYes;
				if (answer === "y" || answer === "yes") return true;
				if (answer === "n" || answer === "no") return false;
				console.log("Please answer y or n.");
			}
		},
		secret: readSecret,
		info(message: string) {
			console.log(message);
		},
	};
}

try {
	const repositoryRoot = await findRepositoryRoot(process.cwd());
	await runSetup({
		repositoryRoot,
		prompter: createTerminalPrompter(),
	});
} catch (error) {
	if (error instanceof SetupCancelledError) {
		console.error(error.message);
		process.exit(130);
	}
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
