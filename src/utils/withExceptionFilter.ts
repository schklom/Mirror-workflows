import { AxiosError, HttpStatusCode } from "axios";
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { ApiError } from "next/dist/server/api-utils";

function getExceptionStatus(exception: unknown) {
	if (exception instanceof AxiosError) if (exception.response) return exception.response.status;

	return exception instanceof ApiError
		? exception.statusCode
		: HttpStatusCode.InternalServerError;
}

function getExceptionMessage(exception: unknown) {
	return isError(exception) ? exception.message : "Internal Server Error";
}

function isError(exception: unknown): exception is Error {
	return exception instanceof Error;
}

export function withExeptionFilter(req: NextApiRequest, res: NextApiResponse) {
	return async function (handler: NextApiHandler) {
		try {
			await handler(req, res);
		} catch (exception) {
			const statusCode = getExceptionStatus(exception);
			const message = getExceptionMessage(exception);
			return res.status(statusCode).json({
				statusCode,
				message,
			});
		}
	};
}
