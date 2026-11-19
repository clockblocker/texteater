import { make as makeScopedAtom } from "@effect/atom-react";
import * as Atom from "effect/reactivity/Atom";
import { initialWorkspace } from "./model";

/**
 * The Compass stage's workspace. Its `Provider` makes its own atom, so a
 * stage remounted under a new key never shares one. Nothing persists it.
 */
export const stageWorkspaceAtom = makeScopedAtom(() =>
	Atom.make(initialWorkspace()),
);
