import * as Atom from "effect/reactivity/Atom";

/**
 * `src/lib/stores/activeCard.js`: the Card element popped out to the centre,
 * if any. Every Card reads it, so only one is out at a time.
 */
export const activeCardAtom = Atom.make<HTMLElement | undefined>(undefined);
