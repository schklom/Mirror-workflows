import { ReactNode } from "react";
import styles from "@/styles/carousel.module.css";

export function Slide({
	children,
	id,
	length,
}: {
	children: ReactNode;
	id: string;
	length: number;
}) {
	const links = new Array(length).fill(0);
	return (
		<>
			<section className={styles.carousel} aria-label="carousel">
				<div className={styles.slides} tabIndex={0}>
					{children}
				</div>
			</section>
			<div className={`${styles["carousel__nav"]} text-center`}>
				{links.map((_media, i) => (
					<a
						key={`#${id}-${i + 1}`}
						href={`#${id}-${i + 1}`}
						className={styles["slider-nav"]}
					>
						{i + 1}
					</a>
				))}
			</div>
		</>
	);
}

export function SlideItem({ id, children }: { id: string; children: ReactNode }) {
	return (
		<div id={id} className={styles["slides-item"]} tabIndex={0}>
			{children}
		</div>
	);
}
