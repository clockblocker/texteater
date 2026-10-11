import { Suspense } from "react";
import { demos } from "@/demos";
import { FixturesPage } from "@/pages/fixtures-page";
import { IndexPage } from "@/pages/index-page";
import { DemoShell } from "@/shell/demo-shell";
import { useHashLocation } from "@/shell/hash-route";

export function App() {
	const { path } = useHashLocation();
	if (path === "/") return <IndexPage />;
	if (path === "/fixtures")
		return (
			<DemoShell
				title="Shared fixtures"
				description="The text, Cards and fake resolutions every demo can use."
			>
				<FixturesPage />
			</DemoShell>
		);
	const demo = demos.find((candidate) => `/${candidate.slug}` === path);
	if (!demo)
		return (
			<DemoShell title="No such demo">
				<p className="p-6 text-ink-muted">Nothing lives at {path}.</p>
			</DemoShell>
		);
	return (
		<DemoShell
			key={demo.slug}
			title={demo.title}
			description={demo.description}
		>
			<Suspense fallback={null}>
				<demo.Component />
			</Suspense>
		</DemoShell>
	);
}
