import {
  AllRetriesFailedError,
  RetryError,
  RetryManuallyStoppedError,
  RetryPromiseHandler,
} from "@/lib";
import { flushPromises } from "tests/_helpers/promise";
import { vi } from "vitest";

vi.useFakeTimers();

describe("Retry promise handler", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe("Promise fulfilled", () => {
    const onSuccessMockFn = vi.fn();
    let retryPromiseHandler: RetryPromiseHandler<string, number>;

    beforeEach(async () => {
      const promise = () => Promise.resolve("Promise fulfilled");
      retryPromiseHandler = new RetryPromiseHandler(promise, {
        retries: 5,
        onSuccess: onSuccessMockFn,
      });
      retryPromiseHandler.start();
      await flushPromises();
    });

    afterEach(() => {
      onSuccessMockFn.mockReset();
    });

    it("should invoke 'onSuccess' function with correct argument", () => {
      expect(onSuccessMockFn).toHaveBeenCalled();
      expect(onSuccessMockFn).toHaveBeenCalledWith("Promise fulfilled");
    });

    it("should retry status be updated to 'STOPPED'", () => {
      expect(retryPromiseHandler.hasRetryProcessStopped).toBe(true);
    });

    it("should retries remaining not be updated", () => {
      expect(retryPromiseHandler.retriesRemaining).toBe(5);
    });
  });

  it("should invoke error retry callback function with correct error payload", async () => {
    const mockFailedRetry = vi.fn();
    const mockPromise = () => Promise.reject<string>("Promise rejected");
    const retryPromiseHandler = new RetryPromiseHandler(mockPromise, {
      retries: 5,
      onFailedRetry: mockFailedRetry,
    });

    retryPromiseHandler.start();

    await flushPromises();

    const [[expectedError]] = mockFailedRetry.mock.calls;
    expect(expectedError).toBeInstanceOf(RetryError);
    expect(expectedError).toEqual(
      expect.objectContaining({
        nativeError: expect.any(Error),
        reason: "Retry failed",
        retriesMade: 1,
        retriesRemaining: 4,
      })
    );
  });

  it("all retries failed", async () => {
    const mockFailedRetryProcess = vi.fn();
    const mockPromise = () => Promise.reject<string>("Promise rejected");
    const retryPromiseHandler = new RetryPromiseHandler(mockPromise, {
      retries: 3,
      backOffAmount: 500,
      onFailedRetryProcess: mockFailedRetryProcess,
    });

    retryPromiseHandler.start();

    await vi.advanceTimersByTimeAsync(500);
    expect(mockFailedRetryProcess).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(mockFailedRetryProcess).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    expect(mockFailedRetryProcess).toHaveBeenCalled();

    const [[expectedError]] = mockFailedRetryProcess.mock.calls;
    expect(expectedError).toBeInstanceOf(AllRetriesFailedError);
    expect(expectedError).toEqual(
      expect.objectContaining({
        nativeError: expect.any(Error),
        reason: "All retries failed",
        retriesMade: 3,
        retriesRemaining: 0,
      })
    );
  });

  it("retry process manually stopped", async () => {
    const mockFailedRetryProcess = vi.fn();
    const mockPromise = () => Promise.reject<string>("Promise rejected");
    const retryPromiseHandler = new RetryPromiseHandler(mockPromise, {
      retries: 3,
      backOffAmount: 500,
      onFailedRetryProcess: mockFailedRetryProcess,
    });

    retryPromiseHandler.start();
    await flushPromises();

    retryPromiseHandler.stop();
    await flushPromises();

    expect(mockFailedRetryProcess).toHaveBeenCalled();
    const [[expectedError]] = mockFailedRetryProcess.mock.calls;
    expect(expectedError).toBeInstanceOf(RetryManuallyStoppedError);
    expect(expectedError).toEqual(
      expect.objectContaining({
        nativeError: expect.any(Error),
        reason: "Retry process manually stopped",
        retriesMade: 1,
        retriesRemaining: 2,
      })
    );
  });

  describe.skip("Retry process with custom backOff properties", () => {
    describe("When providing 'LINEAR' backOff property", () => {});

    describe("When providing 'FIXED' backOff property", () => {});

    describe("When providing 'EXPONENTIAL' backOff property", () => {});

    describe("When providing 'CUSTOM' backOff property", () => {});
  });

  // describe("Promise rejected", () => {
  //   const mockPromiseReject = vi.fn().mockImplementation(() => {
  //     return Promise.reject("Promise rejected");
  //   });

  //   it("should invoke 'onRetryLimitExceeded' when all retries have failed", async () => {
  //     const onRetryLimitExceededMockFn = vi.fn();
  //     const config = {
  //       backOffAmount: 500,
  //       retries: 3,
  //       onRetryLimitExceeded: onRetryLimitExceededMockFn,
  //     } satisfies Configuration;
  //     const retryPromiseHandler = new RetryPromiseHandler(mockPromiseReject, config);
  //     retryPromiseHandler.start();

  //     await flushPromises();
  //     expect(retryPromiseHandler.retriesRemaining).toBe(2);
  //     expect(onRetryLimitExceededMockFn).not.toHaveBeenCalled();
  //     vi.advanceTimersByTime(500);

  //     await flushPromises();
  //     expect(retryPromiseHandler.retriesRemaining).toBe(1);
  //     expect(onRetryLimitExceededMockFn).not.toHaveBeenCalled();
  //     vi.advanceTimersByTime(500);

  //     await flushPromises();
  //     expect(retryPromiseHandler.retriesRemaining).toBe(0);
  //     expect(onRetryLimitExceededMockFn).toHaveBeenCalled();
  //   });

  //   it("should assert correct waiting behavior for 'FIXED' backOff", async () => {
  //     const config = { backOff: "FIXED", backOffAmount: 1500 } satisfies Configuration;
  //     const retryPromiseHandler = new RetryPromiseHandler(mockPromiseReject, config);
  //     retryPromiseHandler.start();

  //     await flushPromises();
  //     expect(mockPromiseReject).toHaveBeenCalledTimes(1);
  //     expect(retryPromiseHandler.retriesRemaining).toBe(4);
  //     expect(setTimeout).toHaveBeenCalledTimes(1);
  //     expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1500);
  //     vi.advanceTimersByTime(1500);

  //     await flushPromises();
  //     expect(mockPromiseReject).toHaveBeenCalledTimes(2);
  //     expect(retryPromiseHandler.retriesRemaining).toBe(3);
  //     expect(setTimeout).toHaveBeenCalledTimes(2);
  //     expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1500);
  //     vi.advanceTimersByTime(1500);

  //     await flushPromises();
  //     expect(mockPromiseReject).toHaveBeenCalledTimes(3);
  //     expect(retryPromiseHandler.retriesRemaining).toBe(2);
  //     expect(setTimeout).toHaveBeenCalledTimes(3);
  //     expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1500);
  //     vi.advanceTimersByTime(1500);

  //     await flushPromises();
  //     expect(mockPromiseReject).toHaveBeenCalledTimes(4);
  //     expect(retryPromiseHandler.retriesRemaining).toBe(1);
  //     expect(setTimeout).toHaveBeenCalledTimes(4);
  //     expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1500);
  //   });

  //   it("should assert correct waiting behavior for 'LINEAR' backOff", async () => {
  //     const config = { backOff: "LINEAR", backOffAmount: 1500 } satisfies Configuration;
  //     const retryPromiseHandler = new RetryPromiseHandler(mockPromiseReject, config);
  //     retryPromiseHandler.start();

  //     await flushPromises();
  //     expect(mockPromiseReject).toHaveBeenCalledTimes(1);
  //     expect(retryPromiseHandler.retriesRemaining).toBe(4);
  //     expect(setTimeout).toHaveBeenCalledTimes(1);
  //     expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 1500);
  //     vi.advanceTimersByTime(1500);

  //     await flushPromises();
  //     expect(mockPromiseReject).toHaveBeenCalledTimes(2);
  //     expect(retryPromiseHandler.retriesRemaining).toBe(3);
  //     expect(setTimeout).toHaveBeenCalledTimes(2);
  //     expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 3000);
  //     vi.advanceTimersByTime(3000);

  //     await flushPromises();
  //     expect(mockPromiseReject).toHaveBeenCalledTimes(3);
  //     expect(retryPromiseHandler.retriesRemaining).toBe(2);
  //     expect(setTimeout).toHaveBeenCalledTimes(3);
  //     expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 4500);
  //     vi.advanceTimersByTime(4500);

  //     await flushPromises();
  //     expect(mockPromiseReject).toHaveBeenCalledTimes(4);
  //     expect(retryPromiseHandler.retriesRemaining).toBe(1);
  //     expect(setTimeout).toHaveBeenCalledTimes(4);
  //     expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 6000);
  //   });

  //   it("should assert correct waiting behavior for 'EXPONENTIAL' backOff", async () => {
  //     const config = {
  //       backOff: "EXPONENTIAL",
  //       backOffAmount: 10,
  //     } satisfies Configuration;
  //     const retryPromiseHandler = new RetryPromiseHandler(mockPromiseReject, config);
  //     retryPromiseHandler.start();

  //     await flushPromises();
  //     expect(mockPromiseReject).toHaveBeenCalledTimes(1);
  //     expect(retryPromiseHandler.retriesRemaining).toBe(4);
  //     expect(setTimeout).toHaveBeenCalledTimes(1);
  //     expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 10);
  //     vi.advanceTimersByTime(10);

  //     await flushPromises();
  //     expect(mockPromiseReject).toHaveBeenCalledTimes(2);
  //     expect(retryPromiseHandler.retriesRemaining).toBe(3);
  //     expect(setTimeout).toHaveBeenCalledTimes(2);
  //     expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 100);
  //     vi.advanceTimersByTime(100);

  //     await flushPromises();
  //     expect(mockPromiseReject).toHaveBeenCalledTimes(3);
  //     expect(retryPromiseHandler.retriesRemaining).toBe(2);
  //     expect(setTimeout).toHaveBeenCalledTimes(3);
  //     expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
  //     vi.advanceTimersByTime(1000);

  //     await flushPromises();
  //     expect(mockPromiseReject).toHaveBeenCalledTimes(4);
  //     expect(retryPromiseHandler.retriesRemaining).toBe(1);
  //     expect(setTimeout).toHaveBeenCalledTimes(4);
  //     expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 10000);
  //   });
  // });
});
