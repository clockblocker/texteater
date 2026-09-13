import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { defaultRunOutputDirectory } from "dumgen/development";
import type { DumgenModelExchange } from "gumgen-old";

export type LaboratoryOperation = "segmentation-chain" | "click-resolution";

export type LoggedError = {
	name: string;
	message: string;
};

export type LaboratorySessionEvent = {
	timestamp: string;
	sessionId: string;
	operation: LaboratoryOperation;
	input: unknown;
	promptNames: string[];
	model: string;
	trace: {
		stages: unknown;
		modelExchanges: readonly DumgenModelExchange[];
	};
	applicationResult: unknown;
	latencyMs: number;
	errors: LoggedError[];
};

export const sessionLogRoot =
	process.env.LABORATORY_SESSION_DIRECTORY ??
	join(defaultRunOutputDirectory, "..", "laboratory", "sessions");

let appendQueue = Promise.resolve();

export function describeErrors(error: unknown): LoggedError[] {
	const errors: LoggedError[] = [];
	let current = error;
	for (let depth = 0; depth < 4 && current instanceof Error; depth += 1) {
		errors.push({ name: current.name, message: current.message });
		current = current.cause;
	}
	if (errors.length === 0) {
		errors.push({ name: "Error", message: String(error) });
	}
	return errors;
}

export async function appendSessionEvent(
	event: LaboratorySessionEvent,
	root = sessionLogRoot,
): Promise<void> {
	const append = async () => {
		const sessionDirectory = join(root, event.sessionId);
		await mkdir(sessionDirectory, { recursive: true });
		await appendFile(
			join(sessionDirectory, "events.jsonl"),
			`${JSON.stringify(event)}\n`,
			"utf8",
		);
	};
	const pending = appendQueue.then(append, append);
	appendQueue = pending.catch(() => undefined);
	await pending;
}
