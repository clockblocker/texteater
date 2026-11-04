import * as KeyValueStore from "effect/persistence/KeyValueStore";
import * as Atom from "effect/reactivity/Atom";
import type * as Schema from "effect/Schema";

/**
 * The one `KeyValueStore` runtime over `localStorage` that every persisted
 * atom shares. Storage is first touched when an atom reads, so a module that
 * imports this one does not need a browser.
 */
const localStorageRuntime = Atom.runtime(
	KeyValueStore.layerStorage(() => localStorage),
);

/**
 * A writable atom persisted in `localStorage` under `key`, through
 * `Atom.kvs` on the shared runtime.
 *
 * The value is stored as JSON, encoded by `schema`. The first read of a
 * missing key writes `defaultValue`. A stored value that does not decode,
 * or Storage that throws, reads as `defaultValue` and is left as it is until
 * the next write; a write that Storage refuses still updates the atom for
 * this page. Other tabs' writes are not heard: there is no `storage`
 * listener.
 */
export function localStorageAtom<
	S extends Schema.ConstraintCodec<unknown, unknown>,
>({
	key,
	schema,
	defaultValue,
}: {
	readonly key: string;
	readonly schema: S;
	readonly defaultValue: () => S["Type"];
}) {
	return Atom.kvs({
		runtime: localStorageRuntime,
		key,
		schema,
		defaultValue,
	});
}
