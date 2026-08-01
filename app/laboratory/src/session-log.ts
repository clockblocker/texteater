import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export type LaboratoryOperation = "segmentation" | "click-resolution";

export type LoggedError = {
	name: string;
	message: string;
};

export type LaboratorySessionEvent = {
	timestamp: string;
	sessionId: string;
	operation: LaboratoryOperation;
	input: unknown;
	promptName: string;
	model: string;
	validatedOutput: unknown;
	applicationResult: unknown;
	latencyMs: number;
	errors: LoggedError[];
};

export const sessionLogRoot = fileURLToPath(
	new URL("../../../battery/dumgen/.laboratory/sessions/", import.meta.url),
);

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
