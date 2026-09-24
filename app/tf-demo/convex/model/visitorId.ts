const MAX_VISITOR_ID_LENGTH = 200;

export function assertVisitorId(visitorId: string): void {
	if (
		visitorId.trim().length === 0 ||
		visitorId.length > MAX_VISITOR_ID_LENGTH
	) {
		throw new Error("visitorId must contain between 1 and 200 characters.");
	}
}
