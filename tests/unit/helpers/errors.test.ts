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
  const testCases = [
    {
      error: new AllRetriesFailedError(nativeError, 3, 0),
      checks: {
        isAllRetriesFailedError: true,
        isExitConditionError: false,
        isRetryManuallyStoppedError: false,
      },
    },
    {
      error: new ExitConditionMetError(nativeError, 3, 0),
      checks: {
        isAllRetriesFailedError: false,
        isExitConditionError: true,
        isRetryManuallyStoppedError: false,
      },
    },
    {
      error: new RetryManuallyStoppedError(nativeError, 3, 0),
      checks: {
        isAllRetriesFailedError: false,
        isExitConditionError: false,
        isRetryManuallyStoppedError: true,
      },
    },
  ];

  describe.each(testCases)("Error type check", ({ error, checks }) => {
    it("should identify 'AllRetriesFailedError' correctly", () => {
      expect(isErrorAllRetriesFailedError(error)).toBe(checks.isAllRetriesFailedError);
    });

    it("should identify 'ExitConditionMetError' correctly", () => {
      expect(isErrorExitConditionMetError(error)).toBe(checks.isExitConditionError);
    });

    it("should identify 'RetryManuallyStoppedError' correctly", () => {
      expect(isErrorRetryManuallyStoppedError(error)).toBe(
        checks.isRetryManuallyStoppedError
      );
    });
  });
});
