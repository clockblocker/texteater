import { useState } from "react";

const VISITOR_STORAGE_KEY = "tf-demo:anonymous-visitor:v1";
const VISITOR_ID_MAX_LENGTH = 200;

type StoredVisitor = { readonly id: string };

export function useAnonymousVisitorId(): string {
	const [visitorId] = useState(loadOrCreateVisitorId);
	return visitorId;
}

export function loadOrCreateVisitorId(): string {
	try {
		const stored = localStorage.getItem(VISITOR_STORAGE_KEY);
		if (stored) {
			const parsed: unknown = JSON.parse(stored);
			if (isStoredVisitor(parsed)) return parsed.id;
		}
	} catch {
		// Storage can be unavailable in privacy modes; use a page-lifetime ID.
	}

	const visitor: StoredVisitor = { id: crypto.randomUUID() };
	try {
		localStorage.setItem(VISITOR_STORAGE_KEY, JSON.stringify(visitor));
	} catch {
		// The in-memory state still keeps this visitor stable for the page lifetime.
	}
	return visitor.id;
}

function isStoredVisitor(value: unknown): value is StoredVisitor {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}
	const id = Reflect.get(value, "id");
	return (
		typeof id === "string" &&
		id.trim().length > 0 &&
		id.length <= VISITOR_ID_MAX_LENGTH
	);
}
