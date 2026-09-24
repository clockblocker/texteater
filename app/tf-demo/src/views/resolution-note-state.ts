import type { ResolutionNote } from "../../convex/model/resolutionSessions";

export function completionTarget(note: ResolutionNote | null) {
	return note?.lifecycle.state === "Terminal" &&
		note.lifecycle.outcome === "Complete"
		? note.lifecycle.target
		: null;
}
