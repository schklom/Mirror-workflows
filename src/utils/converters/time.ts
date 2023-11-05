export function convertTTlToTimestamp(time: string) {
	const format: "m" | "h" | "d" = time.slice(-1).toLowerCase() as "m" | "h" | "d";
	const timeNumber: number = Number(time.slice(0, -1));

	let t: number;
	switch (format) {
		case "m":
			t = timeNumber * 60;
			break;
		case "h":
			t = timeNumber * 60 * 60;
			break;
		case "d":
			t = timeNumber * 60 * 60 * 60;
	}
	return t;
}

export function convertTimestampToRelativeTime(timestamp: number): string {
	const now = new Date();
	const prev = new Date(Math.floor(timestamp * 1000));
	const days = now.getDate() - prev.getDate();

	const DIFFERENCES = {
		seconds: now.getSeconds() - prev.getSeconds(),
		minutes: now.getMinutes() - prev.getMinutes(),
		hours: now.getHours() - prev.getHours(),
		days,
		weeks: (days - Math.round(days / 30) * 30) / 7,
		months: now.getMonth() - prev.getMonth(),
		years: now.getFullYear() - prev.getFullYear(),
	};

	if (DIFFERENCES.years > 0) {
		return DIFFERENCES.years > 1
			? `${DIFFERENCES.years} years ago`
			: `${DIFFERENCES.years} year ago`;
	}

	if (DIFFERENCES.months > 0 && DIFFERENCES.months < 12) {
		return DIFFERENCES.months > 1
			? `${DIFFERENCES.months} months ago`
			: `${DIFFERENCES.months} month ago`;
	}

	if (DIFFERENCES.weeks > 0 && DIFFERENCES.weeks < 4 && DIFFERENCES.days >= 7) {
		return DIFFERENCES.weeks > 1
			? `${DIFFERENCES.weeks} weeks ago`
			: `${DIFFERENCES.weeks} week ago`;
	}

	if (DIFFERENCES.days > 0 && DIFFERENCES.days < 7) {
		return DIFFERENCES.days > 1
			? `${DIFFERENCES.days} days ago`
			: `${DIFFERENCES.days} day ago`;
	}

	if (DIFFERENCES.hours > 0 && DIFFERENCES.hours < 24) {
		return DIFFERENCES.hours > 1
			? `${DIFFERENCES.hours} hours ago`
			: `${DIFFERENCES.hours} hour ago`;
	}

	if (DIFFERENCES.minutes > 0 && DIFFERENCES.minutes < 60) {
		return DIFFERENCES.minutes > 1
			? `${DIFFERENCES.minutes} minutes ago`
			: `${DIFFERENCES.minutes} minute ago`;
	}

	if (DIFFERENCES.seconds > 0 && DIFFERENCES.seconds < 60) {
		return DIFFERENCES.seconds > 1
			? `${DIFFERENCES.seconds} seconds ago`
			: `${DIFFERENCES.seconds} second ago`;
	}

	return "Just now";
}

export function convertTextToTimestamp(timeString: string): number {
	const timeRegex = /^(a|\d+)\s+(\w+)\s+ago$/;
	const match = timeString.match(timeRegex);

	if (!match) {
		return Date.now();
	}

	const time = match[1] === "a" ? 1 : parseInt(match[1]);
	const unit = match[2];
	const now = new Date();

	switch (unit) {
		case "second":
		case "seconds":
			now.setSeconds(now.getSeconds() - time);
			break;
		case "minute":
		case "minutes":
			now.setMinutes(now.getMinutes() - time);
			break;
		case "hour":
		case "hours":
			now.setHours(now.getHours() - time);
			break;
		case "day":
		case "days":
			now.setDate(now.getDate() - time);
			break;
		case "week":
		case "weeks":
			now.setDate(now.getDate() - time * 7);
			break;
		case "month":
		case "months":
			now.setMonth(now.getMonth() - time);
			break;
		case "year":
		case "years":
			now.setFullYear(now.getFullYear() - time);
			break;
	}
	return Math.floor(now.getTime() / 1000);
}
