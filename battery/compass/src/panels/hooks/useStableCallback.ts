import { useCallback, useRef } from "react";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect";

// Forked from useEventCallback (usehooks-ts)
export function useStableCallback<Args extends unknown[], Result>(
	fn: (...args: Args) => Result,
): (...args: Args) => Result {
	const ref = useRef(fn);

	useIsomorphicLayoutEffect(() => {
		ref.current = fn;
	}, [fn]);

	return useCallback((...args: Args) => ref.current(...args), []);
}
