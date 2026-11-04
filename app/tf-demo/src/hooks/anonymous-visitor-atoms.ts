import { isRecord } from "common-utils";
import * as Atom from "effect/reactivity/Atom";

const VISITOR_STORAGE_KEY = "tf-demo:anonymous-visitor:v1";
const VISITOR_ID_MAX_LENGTH = 200;

type StoredVisitor = { readonly id: string };

/**
 * This browser's anonymous Visitor ID: the one in localStorage, or a new one
 * stored there. It is read once per registry and kept alive, so every
 * component gets the same ID even when Storage fails and the ID lives only
 * as long as the page.
 */
export const anonymousVisitorIdAtom = Atom.make(() =>
	loadOrCreateVisitorId(),
).pipe(Atom.keepAlive);

function loadOrCreateVisitorId(): string {
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
		// The kept-alive atom still holds this ID for the page lifetime.
	}
	return visitor.id;
}

function isStoredVisitor(value: unknown): value is StoredVisitor {
	if (!isRecord(value)) return false;
	const { id } = value;
	return (
		typeof id === "string" &&
		id.trim().length > 0 &&
		id.length <= VISITOR_ID_MAX_LENGTH
	);
}
