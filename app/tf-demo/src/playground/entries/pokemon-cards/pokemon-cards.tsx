import { Fragment, useEffect, useRef, useState } from "react";
import { Inspector, InspectorSection } from "../inspector";
import { Card, PageFrame } from "./card";
import { CardList } from "./card-list";
import { proxyCard } from "./card-proxy";
import { SECTIONS, SHOWCASE } from "./sections";
import "./styles";

const TITLE = "Pokémon cards";
const FONTS =
	"https://fonts.googleapis.com/css2?family=Roboto+Condensed:ital,wght@0,300;0,700;1,300;1,700&family=Roboto:ital,wght@0,300;0,700;1,300;1,700&display=swap";

const button =
	"cursor-pointer rounded-md border border-line px-2 py-1 text-xs text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 aria-pressed:border-primary aria-pressed:text-ink";

const anchorOf = (key: string) => `⚓-${key}`;

/**
 * simeydotme's pokemon-cards-css, github.com/simeydotme/pokemon-cards-css at
 * commit acb1197633e749a1fba4412231db2f6581586d00 (2025-12-15), GPL-3.0
 * (`LICENSE`): its Svelte Card ported to React in this folder and its page
 * of sections rendered as `App.svelte` renders them, in a frame that stands
 * in for its window. The CSS and the textures in `img/` are upstream's; the
 * card art, foils and masks load from the URLs upstream loads them from.
 * Its intro copy and each section's paragraphs sit in the inspector; its
 * card search (which needs a pokemontcg.io API key), back-to-top button and
 * analytics are left out.
 */
export function PokemonCards() {
	const frameRef = useRef<HTMLDivElement>(null);
	const [selected, setSelected] = useState<string | null>(null);
	const [only, setOnly] = useState(false);
	const [showcaseRun, setShowcaseRun] = useState(0);

	useEffect(() => {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = FONTS;
		document.head.append(link);
		return () => link.remove();
	}, []);

	// upstream's onMount: a deep link to a section's anchor scrolls to it
	useEffect(() => {
		const hash = decodeURIComponent(window.location.hash).replace(
			/^.*?-/g,
			"",
		);
		if (!hash) return;
		const anchor = [
			...(frameRef.current?.querySelectorAll("h1,h2,h3") ?? []),
		].find((el) => el.getAttribute("id")?.replace(/^.*?-/g, "") === hash);
		if (!anchor) return;
		const timer = setTimeout(() => anchor.scrollIntoView(), 100);
		return () => clearTimeout(timer);
	}, []);

	const jumpTo = (key: string) => {
		setSelected(key);
		requestAnimationFrame(() =>
			document.getElementById(anchorOf(key))?.scrollIntoView(),
		);
	};

	const shown =
		only && selected
			? SECTIONS.filter((section) => section.key === selected)
			: SECTIONS;
	const current = SECTIONS.find((section) => section.key === selected);

	return (
		<>
			<div className="flex h-full min-h-0 p-6 lg:pe-[23rem]">
				<div
					ref={frameRef}
					data-pokemon-cards=""
					className="relative min-h-[36rem] flex-1 overflow-auto rounded-[0.7rem]"
				>
					<PageFrame.Provider value={frameRef}>
						<main>
							<header>
								<h1 id={anchorOf("top")}>
									Pokemon Cards <sup>V2</sup>
								</h1>
								<div className="showcase">
									<Card
										key={showcaseRun}
										{...proxyCard(SHOWCASE)}
									/>
								</div>
							</header>
							{shown.map((section) => (
								<Fragment key={section.key}>
									<h2 id={anchorOf(section.key)}>
										<a href={`#${anchorOf(section.key)}`}>
											{section.title}
											{section.sup ? (
												<sup>{section.sup}</sup>
											) : null}
										</a>
									</h2>
									<CardList>
										{section.cards.map((card) => (
											<Card
												key={card.id}
												{...proxyCard(card)}
											/>
										))}
									</CardList>
								</Fragment>
							))}
						</main>
					</PageFrame.Provider>
				</div>
			</div>
			<Inspector title={TITLE}>
				<InspectorSection>
					<p className="text-ink-soft">
						simeydotme's pokemon-cards-css: CSS for the holofoil
						faces of Pokémon cards, from 3d transforms, filters,
						blend modes and gradients driven by custom properties
						that springs set from the pointer.
					</p>
					<p className="text-ink-soft">
						Move the pointer over a card to tilt it into the light.
						Click a card to take it out to the centre; click it
						again, or anywhere else, to put it back. On a phone,
						tilt the device to tilt the card that is out.
					</p>
					<a
						className="text-xs text-ink-soft underline hover:text-ink"
						href="https://github.com/simeydotme/pokemon-cards-css"
						target="_blank"
						rel="noreferrer"
					>
						Simon Goellner, github.com/simeydotme/pokemon-cards-css
					</a>
				</InspectorSection>
				<InspectorSection title="Showcase">
					<p className="text-ink-soft">
						The header's card turns by itself for 4 s, 2 s after it
						mounts.
					</p>
					<div>
						<button
							type="button"
							className={button}
							onClick={() => setShowcaseRun((run) => run + 1)}
						>
							Replay intro
						</button>
					</div>
				</InspectorSection>
				<InspectorSection title="Effects">
					<div className="flex flex-wrap gap-1">
						{SECTIONS.map((section) => (
							<button
								key={section.key}
								type="button"
								aria-pressed={section.key === selected}
								className={button}
								onClick={() => jumpTo(section.key)}
							>
								{section.title}
								{section.sup ? ` ${section.sup}` : ""}
							</button>
						))}
					</div>
					<label className="flex items-center justify-between gap-3 text-ink-soft">
						Show only the picked effect
						<input
							type="checkbox"
							checked={only}
							onChange={(event) => setOnly(event.target.checked)}
						/>
					</label>
					{current ? (
						<div className="grid gap-2 text-ink-soft">
							{current.copy.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</div>
					) : (
						<p className="text-ink-muted">
							Pick an effect to jump to it and read how upstream
							builds it.
						</p>
					)}
				</InspectorSection>
			</Inspector>
		</>
	);
}
