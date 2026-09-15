/** A quiet inline aside next to a route row. */
export function RouteAside({ children }: { children: React.ReactNode }) {
	return (
		<span className="ms-2 text-sm text-ink-muted compact:text-xs">
			{children}
		</span>
	);
}
