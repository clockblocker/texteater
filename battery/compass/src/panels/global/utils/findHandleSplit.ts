import { getMountedSplits } from "../mutable-state/splits";

export function findHandleSplit(handleElement: HTMLElement) {
	const mountedSplits = getMountedSplits();

	for (const [split] of mountedSplits) {
		if (split.handles.some((handle) => handle.element === handleElement)) {
			return split;
		}
	}

	throw Error("Could not find parent Split for handle element");
}
