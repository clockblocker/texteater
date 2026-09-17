import { createContext, useContext } from "react";

/** Scenarios restrict available inputs/outcomes; the live handlers and motion stay shared. */
export type DeckInteraction =
	| "select"
	| "drag"
	| "remove"
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
	"remove",
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
