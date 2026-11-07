import { useAtom } from "@effect/atom-react";
import {
	type CSSProperties,
	createContext,
	type RefObject,
	useContext,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { activeCardAtom } from "./active-card";
import { type CardController, createCardController } from "./card-controller";
import type { ProxiedCard } from "./card-proxy";
import { orientation } from "./orientation";

/** The entry's scrolling frame, which stands in for upstream's window. */
export const PageFrame = createContext<RefObject<HTMLElement | null>>({
	current: null,
});

const BACK = "https://tcg.pokemon.com/assets/img/global/tcg-card-back-2x.jpg";

/** The markup of upstream's `Card.svelte`; its script is `card-controller`. */
export function Card(props: ProxiedCard) {
	// upstream's prop defaults and the `$:` block that normalises them
	const id = props.id ?? "";
	const name = props.name ?? "";
	const set = props.set ?? "";
	const rarity = (props.rarity ?? "common").toLowerCase();
	const supertype = (props.supertype ?? "pokémon").toLowerCase();
	const number = (props.number ?? "").toLowerCase();
	const types = props.types?.join(" ").toLowerCase() ?? "";
	const subtypes = props.subtypes?.join(" ").toLowerCase() ?? "basic";
	const isTrainerGallery =
		!!number.match(/^[tg]g/i) ||
		!!(id === "swshp-SWSH076" || id === "swshp-SWSH077");
	const imgBase = props.img.startsWith("http")
		? ""
		: "https://images.pokemontcg.io/";

	const view = useContext(PageFrame);
	const cardRef = useRef<HTMLDivElement>(null);
	const [activeCard, setActiveCard] = useAtom(activeCardAtom);
	const activeCardRef = useRef(activeCard);
	activeCardRef.current = activeCard;

	const [active, setActive] = useState(false);
	const [interacting, setInteracting] = useState(false);
	const [loading, setLoading] = useState(true);
	const [foilStyles, setFoilStyles] = useState<CSSProperties>({});
	const [staticStyles] = useState(() => {
		const randomSeed = { x: Math.random(), y: Math.random() };
		const cosmosPosition = {
			x: Math.floor(randomSeed.x * 734),
			y: Math.floor(randomSeed.y * 1280),
		};
		return {
			"--seedx": `${randomSeed.x}`,
			"--seedy": `${randomSeed.y}`,
			"--cosmosbg": `${cosmosPosition.x}px ${cosmosPosition.y}px`,
		} as CSSProperties;
	});

	const controllerRef = useRef<CardController | null>(null);
	useLayoutEffect(() => {
		const controller = createCardController({
			card: () => cardRef.current,
			view: () => view.current,
			activeCard: () => activeCardRef.current,
			setActiveCard: (card) => {
				activeCardRef.current = card;
				setActiveCard(card);
			},
			setActive,
			setInteracting,
		});
		controllerRef.current = controller;
		controller.writeStyles();
		return () => {
			controller.dispose();
			controllerRef.current = null;
		};
	}, [view, setActiveCard]);

	const showcase = props.showcase ?? false;
	useEffect(() => {
		const controller = controllerRef.current;
		if (!controller) return;
		const frameElement = view.current;
		const unsubscribe = orientation.subscribe(
			controller.orientationChanged,
		);
		document.addEventListener(
			"visibilitychange",
			controller.visibilityChanged,
		);
		frameElement?.addEventListener("scroll", controller.reposition);
		if (showcase) controller.startShowcase();
		return () => {
			unsubscribe();
			document.removeEventListener(
				"visibilitychange",
				controller.visibilityChanged,
			);
			frameElement?.removeEventListener("scroll", controller.reposition);
		};
	}, [view, showcase]);

	useEffect(() => {
		controllerRef.current?.activeCardChanged(orientation.get());
	}, [activeCard]);

	const { mask, foil } = props;
	const imageLoader = () => {
		setLoading(false);
		if (mask || foil) {
			setFoilStyles({
				"--mask": `url(${mask})`,
				"--foil": `url(${foil})`,
			} as CSSProperties);
		}
	};

	const className = [
		`card ${types} / interactive / `,
		active ? "active" : "",
		interacting ? "interacting" : "",
		loading ? "loading" : "",
		mask ? "masked" : "",
	]
		.filter(Boolean)
		.join(" ");

	return (
		<div
			ref={cardRef}
			className={className}
			data-number={number}
			data-set={set}
			data-subtypes={subtypes}
			data-supertype={supertype}
			data-rarity={rarity}
			data-trainer-gallery={isTrainerGallery}
		>
			<div className="card__translater">
				<button
					type="button"
					className="card__rotator"
					onClick={() => controllerRef.current?.activate()}
					onPointerMove={(event) =>
						controllerRef.current?.interact(event.nativeEvent)
					}
					onMouseOut={() => controllerRef.current?.interactEnd()}
					onBlur={() => controllerRef.current?.deactivate()}
					aria-label={`Expand the Pokemon Card; ${name}.`}
					tabIndex={0}
				>
					<img
						className="card__back"
						src={props.back ?? BACK}
						alt="The back of a Pokemon Card, a Pokeball in the center with Pokemon logo above and below"
						loading="lazy"
						width="660"
						height="921"
					/>
					<div
						className="card__front"
						style={{ ...staticStyles, ...foilStyles }}
					>
						<img
							src={imgBase + props.img}
							alt={`Front design of the ${name} Pokemon Card, with the stats and info around the edge`}
							onLoad={imageLoader}
							loading="lazy"
							width="660"
							height="921"
						/>
						<div className="card__shine" />
						<div className="card__glare" />
					</div>
				</button>
			</div>
		</div>
	);
}
