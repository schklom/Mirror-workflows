import { ReactNode } from "react";
import { ViewOnIG } from "./ViewOnIG";
import { CheckOutPixelfed } from "./CheckOutPixelfed";
import { InstancesLinks } from "./InstancesLink";

type Props = {
	statusCode: number;
	title: string;
	children: ReactNode;
	includeInstances?: boolean;
};

export function ErrorMessage({ statusCode, title, children, includeInstances = true }: Props) {
	return (
		<>
			<h2 className="text-5xl font-bold m-4 text-center">{statusCode}</h2>
			<h1 className="text-2xl font-bold mb-4 text-center">{title}</h1>
			<p className="text-center">{children}</p>
			<div className="grid place-content-center">
				<ul className="list-disc m-5 pl-10">
					{includeInstances && <InstancesLinks />}
					<li>
						<ViewOnIG />
					</li>
				</ul>
			</div>
			<CheckOutPixelfed />
		</>
	);
}
