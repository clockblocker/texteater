/** How long to wait before each retry of a write Convex refused for its write rate. */
const RATE_LIMIT_RETRY_DELAYS_MS = [1000, 2000] as const;

/**
 * Whether Convex refused a write for spending the deployment's per-second
 * write budget, which a long trace can use up before its last write.
 */
function isWriteRateLimit(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return (
		message.includes("TooManyWrites") || message.includes("Too many writes")
	);
}

const sleep = (ms: number) =>
	new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Saves part of a dev-only trace without letting it decide the Visitor's
 * outcome: a write refused for the write rate is retried after a pause, and
 * any write that still fails is logged and dropped. The work the trace
 * describes has already succeeded or failed on its own.
 */
export async function saveTrace(
	label: string,
	write: () => Promise<unknown>,
	pause: (ms: number) => Promise<void> = sleep,
): Promise<void> {
	for (let attempt = 0; ; attempt += 1) {
		try {
			await write();
			return;
		} catch (error) {
			const delay = RATE_LIMIT_RETRY_DELAYS_MS[attempt];
			if (delay === undefined || !isWriteRateLimit(error)) {
				console.warn(`${label} could not be saved`, error);
				return;
			}
			await pause(delay);
		}
	}
}
