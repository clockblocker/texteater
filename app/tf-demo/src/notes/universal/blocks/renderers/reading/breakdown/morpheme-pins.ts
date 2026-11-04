import { useAtom } from "@effect/atom-react";
import { morphemePinAtom } from "./morpheme-pin-atoms";

/** The pinned morpheme of the line `owner` names, and a setter for it. */
export function useMorphemePin(
	owner: string,
): readonly [number | null, (index: number | null) => void] {
	return useAtom(morphemePinAtom(owner));
}
