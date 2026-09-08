import { createContext, type ReactNode, useContext } from "react";
import { createPortal } from "react-dom";

export const PlaygroundControlsContext = createContext<HTMLElement | null>(
	null,
);

export function PlaygroundControls({ children }: { children: ReactNode }) {
	const container = useContext(PlaygroundControlsContext);
	return container ? createPortal(children, container) : null;
}
