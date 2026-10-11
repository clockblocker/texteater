import { demos } from "@/demos";
import { shellParams } from "@/shell/demo-shell";
import { hashHref, useHashLocation } from "@/shell/hash-route";
import { settingsFromParams } from "@/shell/settings";

/** The list of demos, plus the shared fixtures page. */
export function IndexPage() {
	const { params } = useHashLocation();
	const keep = shellParams(params);
	return (
		<main
			dir={settingsFromParams(params).dir}
			className="dark min-h-dvh bg-canvas text-ink"
		>
			<div className="mx-auto grid max-w-note gap-8 px-5 py-10">
				<header className="grid gap-2">
					<h1 className="text-2xl font-semibold tracking-tight">
						Layout playground
					</h1>
					<p className="text-ink-soft">
						Small demos of layout concepts for the tf-demo layout
						redesign. Each runs in a frame you can set to phone,
						tablet or desktop width, right-to-left, light, or with
						reduced motion.
					</p>
				</header>
				<ol className="grid gap-2">
					{demos.map((demo, index) => (
						<li key={demo.slug}>
							<a
								href={hashHref(`/${demo.slug}`, keep)}
								className="grid grid-cols-[2rem_1fr] gap-x-2 rounded-lg border border-line bg-paper px-4 py-3 hover:border-line-strong hover:bg-raised"
							>
								<span className="font-mono text-ink-faint tabular-nums">
									{index + 1}
								</span>
								<span className="font-medium text-link">
									{demo.title}
								</span>
								<span className="col-start-2 text-sm text-ink-soft">
									{demo.description}
								</span>
								<span className="col-start-2 text-xs text-ink-muted">
									After {demo.inspiration.join(", ")}
								</span>
							</a>
						</li>
					))}
				</ol>
				<p className="text-sm text-ink-muted">
					The demos share their text, Cards and fake resolutions;{" "}
					<a
						href={hashHref("/fixtures", keep)}
						className="text-link hover:underline"
					>
						see the shared fixtures
					</a>
					.
				</p>
			</div>
		</main>
	);
}
