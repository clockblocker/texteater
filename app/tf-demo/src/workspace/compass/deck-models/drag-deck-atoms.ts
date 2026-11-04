import { make as makeScopedAtom } from "@effect/atom-react";
import * as Atom from "effect/reactivity/Atom";
import { initialWorkspace } from "./model";

/**
 * A Compass stage's workspace, opening at its scene. Each stage's
 * `Provider` makes its own atom, so stages shown side by side, or a stage
 * remounted under a new key, never share one. Nothing persists it.
 */
export const stageWorkspaceAtom = makeScopedAtom(
	(scene: Parameters<typeof initialWorkspace>[0]) =>
		Atom.make(initialWorkspace(scene)),
);
