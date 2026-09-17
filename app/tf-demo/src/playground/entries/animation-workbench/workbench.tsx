import { useEffect } from "react";

import type { EntryRoute } from "../../playground-router";
import { entryFor, neighbour } from "./catalog";
import { CatalogView } from "./catalog-view";
import { Stage } from "./stage";

export function AnimationWorkbench({ route }: { route: EntryRoute }) {
	const requested = route.segments[0];
	const entry = entryFor(requested);
	useEffect(() => {
		if (requested !== undefined && !entryFor(requested))
			route.setSegments([], { replace: true });
	}, [requested, route]);
	if (!entry)
		return <CatalogView onOpen={(key) => route.setSegments([key])} />;
	return (
		<Stage
			key={entry.key}
			entry={entry}
			nav={{
				onBack: () => route.setSegments([]),
				onGo: (step) => {
					const next = neighbour(entry.key, step);
					if (next) route.setSegments([next.key]);
				},
			}}
		/>
	);
}
