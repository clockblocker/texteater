import { createContext, useContext } from "react";

/**
 * The per-interaction gate. A scenario, such as one of the animation
 * workbench's, restricts which inputs and outcomes are live; the handlers
 * and the motion stay the same. `sweep` is the swipe toward inline-start
 * that sweeps a whole Deck (issue 479); `dismiss` is the Sweep by a
 * dismissive click or Escape.
 */
export type DeckInteraction =
	| "select"
	| "drag"
	| "sweep"
	| "expand"
	| "drop"
	| "collapse"
	| "lift"
	| "follow"
	| "contexts"
	| "deal"
	| "dismiss";
export const ALL_INTERACTIONS: readonly DeckInteraction[] = [
	"select",
	"drag",
	"sweep",
	"expand",
	"drop",
	"collapse",
	"lift",
	"follow",
	"contexts",
	"deal",
	"dismiss",
];
export const DeckInteractions = createContext(ALL_INTERACTIONS);
export function useDeckInteractions() {
	const interactions = useContext(DeckInteractions);
	return (interaction: DeckInteraction) => interactions.includes(interaction);
}
