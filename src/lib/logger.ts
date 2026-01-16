import { Platforms } from "./enum";

/**
 * Error logging interface
 */
interface ErrorLogParams {
  error_details: string;
  log_context: string;
  build_version: string;
}

/**
 * Logs errors to console (can be extended to log to external service)
 * @param params - Error logging parameters
 * @param should_throw - Whether to throw the error after logging
 */
export async function logError(
  params: ErrorLogParams,
  should_throw: boolean = false
): Promise<void> {
  const log_message = `[${params.log_context}] ${params.error_details}  | Version: ${params.build_version}`;

  console.error(log_message);

  // TODO: Add external logging service integration here if needed
  // Example: await supabaseManager.logError(params);

  if (should_throw) {
    throw new Error(params.error_details);
  }
}
