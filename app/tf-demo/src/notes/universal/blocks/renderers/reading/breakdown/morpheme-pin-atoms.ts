import * as Atom from "effect/reactivity/Atom";

/**
 * Which morpheme a click pinned on a morphemes line, by the line's owner, or
 * `null` when none is pinned. The pin survives the Note unmounting when the
 * morpheme's Note opens, and shows again on the way back, so the atom stays
 * alive with no subscriber. It lasts as long as the registry: the session.
 */
export const morphemePinAtom = Atom.family((_owner: string) =>
	Atom.make<number | null>(null).pipe(Atom.keepAlive),
);
