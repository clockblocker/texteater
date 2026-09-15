import { useAction } from "convex/react";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { useCallback, useState } from "react";

export function usePendingAction<Action extends FunctionReference<"action">>(
	action: Action,
) {
	const execute = useAction(action);
	const [isPending, setIsPending] = useState(false);
	const run = useCallback(
		async (
			args: FunctionArgs<Action>,
		): Promise<FunctionReturnType<Action>> => {
			setIsPending(true);
			try {
				return await execute(args);
			} finally {
				setIsPending(false);
			}
		},
		[execute],
	);
	return { run, isPending } as const;
}
