import { NoteAside } from "lego";

/** A quiet inline aside next to a route row. */
export function RouteAside({ children }: { children: React.ReactNode }) {
	return <NoteAside className="ms-2">{children}</NoteAside>;
}
