import type { ResolutionNote } from "../../convex/model/resolutionSessions";

export function completionTarget(note: ResolutionNote | null) {
	return note?.terminal?.kind === "Complete" ? note.terminal.target : null;
}
