import { useAtomValue } from "@effect/atom-react";
import { anonymousVisitorIdAtom } from "./anonymous-visitor-atoms";

/** This browser's anonymous Visitor ID, the same for every component. */
export function useAnonymousVisitorId(): string {
	return useAtomValue(anonymousVisitorIdAtom);
}
