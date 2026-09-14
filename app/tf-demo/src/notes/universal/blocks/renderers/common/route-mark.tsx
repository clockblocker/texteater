import { Mark } from "lego";

/**
 * Route glyphs. A route Note is one hop between what was read and what it
 * means, so every row states its direction relative to this Note:
 * `→` leads on toward a Reading, `←` was reached from, `≡` shares the written
 * form, `?` might be what a Shadow stands for.
 */
const ROUTE_MARKS = {
	leadsTo: "→",
	reachedFrom: "←",
	sameWrittenForm: "≡",
	candidate: "?",
} as const;

const ROUTE_LABELS: Record<keyof typeof ROUTE_MARKS, string> = {
	leadsTo: "leads to",
	reachedFrom: "reached from",
	sameWrittenForm: "same written form",
	candidate: "candidate",
};

export type RouteHop = keyof typeof ROUTE_MARKS;

export function RouteMark({
	hop,
	className,
}: {
	hop: RouteHop;
	className?: string;
}) {
	return (
		<Mark
			role="img"
			aria-label={ROUTE_LABELS[hop]}
			title={ROUTE_LABELS[hop]}
			className={className}
		>
			{ROUTE_MARKS[hop]}
		</Mark>
	);
}
