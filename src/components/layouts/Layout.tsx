import { Header } from "./Header";
import { ReactNode } from "react";
import { Meta } from "../Meta";
import "react-loading-skeleton/dist/skeleton.css";

type Props = {
	children: ReactNode;
	className?: string;
	meta: {
		title: string;
		description: string;
	};
};

export function Layout({ children, className, meta }: Props) {
	return (
		<>
			<Meta title={meta.title} description={meta.description} />
			<Header />
			<main className={className}>{children}</main>
		</>
	);
}
