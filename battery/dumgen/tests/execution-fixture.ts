import type { ModelExecutor, ModelRequest } from "dumgen/types";
import type { TypeSafeExecutor } from "promptsmith/typesafe";

/** Injected outputs check projection and orchestration, never live linguistic accuracy. */
export function executeOutput(
	execute: (request: ModelRequest) => Promise<unknown>,
): ModelExecutor {
	return async (request) => ({ output: await execute(request) });
}
export const rejectJudgment: TypeSafeExecutor = async () => {
	throw Error("Unexpected TypeSafe judgment in this fixture");
};
