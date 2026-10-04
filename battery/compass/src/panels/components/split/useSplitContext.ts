import { useContext } from "react";
import { assert } from "../../utils/assert";
import { SplitContext } from "./SplitContext";

export function useSplitContext() {
	const context = useContext(SplitContext);
	assert(
		context,
		"Split Context not found; did you render a Region or Handle outside of a Split?",
	);

	return context;
}
