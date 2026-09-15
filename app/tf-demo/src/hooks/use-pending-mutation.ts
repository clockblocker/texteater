import { useMutation } from "convex/react";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import { useCallback, useState } from "react";

export function usePendingMutation<
	Mutation extends FunctionReference<"mutation">,
>(mutation: Mutation) {
	const execute = useMutation(mutation);
	const [isPending, setIsPending] = useState(false);
	const run = useCallback(
		async (
			args: FunctionArgs<Mutation>,
		): Promise<FunctionReturnType<Mutation>> => {
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
