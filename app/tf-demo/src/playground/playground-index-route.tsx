import { Link } from "react-router-dom";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { CARD_DEMO_VARIANT } from "@/playground/card-demo/card-demo-contract";
import { cardDemoHref } from "@/playground/card-demo/card-demo-navigation";
import { PLAYGROUND_BASE_PATH } from "@/playground/playground-navigation";
import {
	SHEET_WORKSPACE_VARIANT_LABEL,
	SHEET_WORKSPACE_VARIANTS,
} from "@/playground/sheet-workspace/sheet-workspace-contract";

export type PlaygroundDemo = {
	readonly id: string;
	readonly family: string;
	readonly implementation: string;
	readonly description: string;
	readonly href: string;
};

export const PLAYGROUND_DEMOS: readonly PlaygroundDemo[] = [
	{
		id: `card-demo-${CARD_DEMO_VARIANT}`,
		family: "Resolution card interaction",
		implementation: "Motion",
		description:
			"Drag, open, dismiss, and keyboard-test the fake Resolution Chain card stack.",
		href: cardDemoHref({ page: "text", variant: CARD_DEMO_VARIANT }),
	},
	...SHEET_WORKSPACE_VARIANTS.map((variant) => ({
		id: `sheet-workspace-${variant}`,
		family: "Pane-local Sheet workspace",
		implementation: SHEET_WORKSPACE_VARIANT_LABEL[variant],
		description:
			"Move top Sheets between panes and preview transient Cards using this drag-and-drop adapter.",
		href: `${PLAYGROUND_BASE_PATH}/sheet-workspace/${variant}`,
	})),
];

export function PlaygroundIndexRoute() {
	return (
		<main className="flex-1 bg-background px-4 py-8 sm:px-6 sm:py-12">
			<div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
				<header className="flex flex-col gap-2">
					<p className="text-sm font-medium text-muted-foreground">
						Interaction experiments
					</p>
					<h1 className="text-3xl font-semibold tracking-tight">
						Playground
					</h1>
					<p className="max-w-2xl text-muted-foreground">
						Isolated demos for comparing interaction behavior. Each
						route uses fake data and stays separate from production
						state.
					</p>
				</header>

				<ul className="grid gap-4 sm:grid-cols-2">
					{PLAYGROUND_DEMOS.map((demo) => (
						<li key={demo.id}>
							<Link
								className="group block h-full rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
								to={demo.href}
							>
								<Card className="h-full transition-colors group-hover:bg-muted/50">
									<CardHeader>
										<CardTitle>{demo.family}</CardTitle>
										<CardDescription>
											{demo.implementation}
										</CardDescription>
									</CardHeader>
									<CardContent className="text-muted-foreground">
										{demo.description}
									</CardContent>
								</Card>
							</Link>
						</li>
					))}
				</ul>
			</div>
		</main>
	);
}
