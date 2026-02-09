/**
 * Detect Gemini "invalid API key" errors from the SDK or API response.
 * Message can look like: "[400 Bad Request] API key not valid. Please pass a valid API key."
 * or include API_KEY_INVALID in the body.
 */
export function isInvalidApiKeyError(err: unknown): boolean {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : "";
  const lower = message.toLowerCase();
  return (
    lower.includes("api key not valid") ||
    lower.includes("api_key_invalid") ||
    lower.includes("invalid api key") ||
    lower.includes("please pass a valid api key")
  );
}

export const INVALID_API_KEY_MESSAGE =
  "Your API key is invalid. Please check it in Settings.";

export const API_KEY_INVALID_CODE = "API_KEY_INVALID";
