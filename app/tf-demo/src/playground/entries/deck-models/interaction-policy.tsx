import { createContext, useContext } from "react";

/**
 * Scenarios restrict available inputs/outcomes; the live handlers and motion
 * stay shared. `sweep` is the swipe-left Sweep of a whole Deck (issue 479);
 * `dismiss` is the Sweep by a dismissive click or Escape.
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
