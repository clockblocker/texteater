import { ENTRIES, SECTIONS } from "./catalog";

export function CatalogView({ onOpen }: { onOpen: (key: string) => void }) {
	return (
		<div className="mx-auto flex min-h-full max-w-[64rem] flex-col gap-9 px-6 py-8">
			<header className="max-w-[42rem] space-y-2">
				<p className="font-mono text-xs tracking-widest text-ink-muted uppercase">
					Animation workbench · {ENTRIES.length} scenarios
				</p>
				<h1 className="text-2xl text-ink">
					The deck, one interaction at a time
				</h1>
				<p className="text-sm leading-relaxed text-ink-muted">
					Try the gestures used in deck-models, with the same cards
					and behavior. Create a variant to change the motion and
					compare it with the baseline.
				</p>
			</header>
			{SECTIONS.map((section) => (
				<section key={section.title} className="space-y-2">
					<h2 className="border-b border-line pb-2 font-mono text-xs tracking-widest text-ink-muted uppercase">
						{section.title}
					</h2>
					{section.entries.map((entry) => (
						<button
							key={entry.key}
							type="button"
							data-entry={entry.key}
							onClick={() => onOpen(entry.key)}
							className="group grid w-full gap-2 rounded-lg px-3 py-4 text-start hover:bg-paper focus-visible:outline-2 focus-visible:outline-link sm:grid-cols-[12rem_1fr_auto]"
						>
							<span className="text-sm text-ink">
								{entry.title}
							</span>
							<span className="text-sm leading-relaxed text-ink-muted">
								{entry.instruction}
							</span>
							<span
								aria-hidden="true"
								className="hidden text-ink-faint group-hover:text-ink sm:block"
							>
								↗
							</span>
						</button>
					))}
				</section>
			))}
		</div>
	);
}
