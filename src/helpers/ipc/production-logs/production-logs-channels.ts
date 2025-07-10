// IPC channels for production logs
export const PRODUCTION_LOGS_CHANNELS = {
	GET_LOG_INFO: "production-logs:get-log-info",
	OPEN_LOG_DIRECTORY: "production-logs:open-log-directory",
	OPEN_LOG_FILE: "production-logs:open-log-file",
	LOG_MESSAGE: "production-logs:log-message",
} as const;
