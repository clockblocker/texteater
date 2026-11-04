import * as Atom from "effect/reactivity/Atom";
import * as Schema from "effect/Schema";
import { localStorageAtom } from "@/lib/local-storage-atoms";

/**
 * Whether the inspector of the prototype named `title` is open. It is open
 * until closed, and each prototype remembers its own across reloads.
 */
export const inspectorOpenAtom = Atom.family((title: string) =>
	localStorageAtom({
		key: `tf-demo:playground:${title.toLowerCase()}:inspector-open`,
		schema: Schema.Boolean,
		defaultValue: () => true,
	}),
);
