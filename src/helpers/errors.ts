import {
  AllRetriesFailedError,
  ExitConditionMetError,
  RetryManuallyStoppedError,
} from "@/lib";
import type { FinalError } from "@/types";

export function isErrorAllRetriesFailedError(
  error: FinalError
): error is AllRetriesFailedError {
  return error.reason === "All retries failed";
}

export function isErrorExitConditionMetError(
  error: FinalError
): error is ExitConditionMetError {
  return error.reason === "Exit condition met";
}

export function isErrorRetryManuallyStoppedError(
  error: FinalError
): error is RetryManuallyStoppedError {
  return error.reason === "Retry process manually stopped";
}
