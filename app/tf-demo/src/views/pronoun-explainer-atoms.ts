import * as Atom from "effect/reactivity/Atom";

/**
 * The explainer's UI state. Holding the Explainer Modifier, Cmd on Apple
 * platforms and Ctrl elsewhere, turns a Scroll's hovers and clicks into
 * explainer ones; letting go, or the window losing focus, turns them back.
 */

/** A pronoun unit under the explainer: its Sentence, its Segments and the one under the pointer. */
export type ExplainerTarget = {
	readonly sentenceId: string;
	readonly pronoun: readonly number[];
	readonly segmentIndex: number;
};

/** Whether this browser runs on an Apple platform, where Cmd is the modifier. */
function onApplePlatform(): boolean {
	const agent = navigator as Navigator & {
		readonly userAgentData?: { readonly platform?: string };
	};
	const platform = agent.userAgentData?.platform ?? navigator.platform ?? "";
	return /mac|iphone|ipad|ipod/i.test(platform);
}

/** The key that holds the explainer: `Meta` (Cmd) on Apple platforms, `Control` elsewhere. */
export function explainerModifierKey(): "Meta" | "Control" {
	return onApplePlatform() ? "Meta" : "Control";
}

/** Whether a keyboard or pointer event happened with the explainer's key held. */
export function holdsExplainerModifier(event: {
	readonly metaKey: boolean;
	readonly ctrlKey: boolean;
}): boolean {
	return explainerModifierKey() === "Meta" ? event.metaKey : event.ctrlKey;
}

/** The pronoun under the pointer, held or not, so pressing the key over it shows it at once. */
export const hoveredPronounAtom = Atom.make<ExplainerTarget | null>(null);

/** The pronoun the last explainer click asked about, shown until the key is let go. */
export const pinnedPronounAtom = Atom.make<ExplainerTarget | null>(null);

/**
 * Whether the explainer's key is held. Its read owns the window listeners
 * while anything reads it: a key going down or up, a pointer moving with
 * or without it (a key pressed while the page had no focus), and the
 * window losing focus or being hidden, which let go. Letting go unpins.
 */
export const explainerHeldAtom = Atom.make((get): boolean => {
	// A server render, or a static one in a test, holds nothing.
	if (typeof window === "undefined") return false;
	const key = explainerModifierKey();
	let held = false;
	const hold = (next: boolean) => {
		if (next === held) return;
		held = next;
		if (!next) get.set(pinnedPronounAtom, null);
		get.setSelf(next);
	};
	const onKey = (event: KeyboardEvent) => {
		if (event.key === key) hold(event.type === "keydown");
	};
	const onPointer = (event: PointerEvent) =>
		hold(holdsExplainerModifier(event));
	const letGo = () => hold(false);
	const onVisibility = () => {
		if (document.visibilityState === "hidden") letGo();
	};
	window.addEventListener("keydown", onKey);
	window.addEventListener("keyup", onKey);
	window.addEventListener("pointermove", onPointer, { passive: true });
	window.addEventListener("blur", letGo);
	document.addEventListener("visibilitychange", onVisibility);
	get.addFinalizer(() => {
		window.removeEventListener("keydown", onKey);
		window.removeEventListener("keyup", onKey);
		window.removeEventListener("pointermove", onPointer);
		window.removeEventListener("blur", letGo);
		document.removeEventListener("visibilitychange", onVisibility);
	});
	return false;
});

/** The pronoun the explainer shows: while the key is held, the hovered one, else the pinned one. */
export const shownPronounAtom = Atom.make((get): ExplainerTarget | null =>
	get(explainerHeldAtom)
		? (get(hoveredPronounAtom) ?? get(pinnedPronounAtom))
		: null,
);

/**
 * The hovered pronoun if it is in this Sentence, else null: what one
 * Sentence reads, so a hover re-renders only the Sentences it enters or
 * leaves.
 */
export const hoveredPronounInAtom = Atom.family((sentenceId: string) =>
	Atom.make((get): ExplainerTarget | null => {
		const hovered = get(hoveredPronounAtom);
		return hovered?.sentenceId === sentenceId ? hovered : null;
	}),
);
