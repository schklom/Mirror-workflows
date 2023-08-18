import { Header } from "./Header";
import { DependencyList, ReactNode } from "react";
import "react-loading-skeleton/dist/skeleton.css";

type Props = {
	children: ReactNode;
	className?: string;
};

export function Layout({ children, className }: Props) {
	return (
		<>
			<Header />
			<main className={className}>{children}</main>
		</>
	);
}
