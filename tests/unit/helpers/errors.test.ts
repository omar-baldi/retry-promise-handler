import {
  isErrorAllRetriesFailedError,
  isErrorExitConditionMetError,
  isErrorRetryManuallyStoppedError,
} from "@/helpers/errors";
import {
  AllRetriesFailedError,
  ExitConditionMetError,
  RetryManuallyStoppedError,
} from "@/lib";

describe("Errors", () => {
  const nativeError = new Error("Error");

  it.each([
    [new AllRetriesFailedError(nativeError, 3, 0), true],
    [new ExitConditionMetError(nativeError, 3, 0), false],
    [new RetryManuallyStoppedError(nativeError, 3, 0), false],
  ])("isErrorAllRetriesFailedError", (error, isAllRetriesFailedError) => {
    expect(isErrorAllRetriesFailedError(error)).toBe(isAllRetriesFailedError);
  });

  it.each([
    [new AllRetriesFailedError(nativeError, 3, 0), false],
    [new ExitConditionMetError(nativeError, 3, 0), true],
    [new RetryManuallyStoppedError(nativeError, 3, 0), false],
  ])("isErrorExitConditionMetError", (error, isErrorExitCondition) => {
    expect(isErrorExitConditionMetError(error)).toBe(isErrorExitCondition);
  });

  it.each([
    [new AllRetriesFailedError(nativeError, 3, 0), false],
    [new ExitConditionMetError(nativeError, 3, 0), false],
    [new RetryManuallyStoppedError(nativeError, 3, 0), true],
  ])("isErrorRetryManuallyStoppedError", (error, isErrorRetryManuallyStopped) => {
    expect(isErrorRetryManuallyStoppedError(error)).toBe(isErrorRetryManuallyStopped);
  });
});
