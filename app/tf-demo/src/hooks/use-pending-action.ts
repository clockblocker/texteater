import { RegistryContext } from "@effect/atom-react";
import { useAction } from "convex/react";
import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
} from "convex/server";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import {
	useCallback,
	useContext,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import {
	createCommandScheduler,
	runCommandEffect,
	squashCommandFailure,
	tryCommandPromise,
} from "@/lib/command-scheduler";

const pendingActionScheduler = createCommandScheduler();

/**
 * Schedules an action under `singleFlight` concurrency for `laneKey` so
 * overlapping invocations share one in-flight call instead of racing.
 */
export function schedulePendingAction<Args, Result>(
	registry: AtomRegistry.AtomRegistry,
	laneKey: string,
	args: Args,
	execute: (args: Args) => Promise<Result>,
) {
	return pendingActionScheduler.schedule(
		registry,
		{ mode: "singleFlight", key: () => laneKey },
		args,
		tryCommandPromise(() => execute(args)),
	);
}

export function usePendingAction<Action extends FunctionReference<"action">>(
	action: Action,
) {
	const registry = useContext(RegistryContext);
	const laneKey = useId();
	const execute = useAction(action);
	const [pendingCount, setPendingCount] = useState(0);
	const isMountedRef = useRef(true);

	// oxlint-disable-next-line textfresser/no-unreasoned-state-sync -- tracks mounted lifetime to guard async completion state updates
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
		};
	}, []);

	const run = useCallback(
		async (
			args: FunctionArgs<Action>,
		): Promise<FunctionReturnType<Action>> => {
			setPendingCount((count) => count + 1);
			try {
				const outcome = await runCommandEffect(
					schedulePendingAction(registry, laneKey, args, execute),
				);
				if (AsyncResult.isFailure(outcome)) {
					throw squashCommandFailure(outcome);
				}
				return outcome.value;
			} finally {
				if (isMountedRef.current) {
					setPendingCount((count) => Math.max(0, count - 1));
				}
			}
		},
		[execute, laneKey, registry],
	);
	return { run, isPending: pendingCount > 0 } as const;
}
