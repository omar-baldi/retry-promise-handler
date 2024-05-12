import {
  AllRetriesFailedError,
  ExitConditionMetError,
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

  it("fail", () => {
    expect(true).toBe(false);
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

  it("retry process exit condition met", async () => {
    const mockFailedRetryProcess = vi.fn();
    const mockPromise = () => Promise.reject<string>("Promise rejected");
    const retryPromiseHandler = new RetryPromiseHandler(mockPromise, {
      retries: 4,
      backOffAmount: 500,
      onFailedRetryProcess: mockFailedRetryProcess,
      shouldRetryOnCondition: vi
        .fn()
        .mockImplementation((err: RetryError) => err.retriesMade <= 2),
    });

    retryPromiseHandler.start();
    await flushPromises();
    expect(mockFailedRetryProcess).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(mockFailedRetryProcess).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(500);
    expect(mockFailedRetryProcess).toHaveBeenCalled();
    const [[expectedError]] = mockFailedRetryProcess.mock.calls;
    expect(expectedError).toBeInstanceOf(ExitConditionMetError);
    expect(expectedError).toEqual(
      expect.objectContaining({
        nativeError: expect.any(Error),
        reason: "Exit condition met",
        retriesMade: 3,
        retriesRemaining: 1,
      })
    );
  });

  it("FIXED backOff property", async () => {
    const mockFailedRetry = vi.fn();
    const mockPromise = () => Promise.reject("Promise rejected");
    const retryPromiseHandler = new RetryPromiseHandler(mockPromise, {
      retries: 4,
      backOff: "FIXED",
      backOffAmount: 500,
      onFailedRetry: mockFailedRetry,
    });

    retryPromiseHandler.start();

    await flushPromises();
    expect(mockFailedRetry).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(500);
    expect(mockFailedRetry).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(500);
    expect(mockFailedRetry).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(500);
    expect(mockFailedRetry).toHaveBeenCalledTimes(4);
  });

  it("LINEAR backOff property", async () => {
    const mockFailedRetry = vi.fn();
    const mockPromise = () => Promise.reject("Promise rejected");
    const retryPromiseHandler = new RetryPromiseHandler(mockPromise, {
      retries: 4,
      backOff: "LINEAR",
      backOffAmount: 500,
      onFailedRetry: mockFailedRetry,
    });

    retryPromiseHandler.start();

    await flushPromises();
    expect(mockFailedRetry).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(500);
    expect(mockFailedRetry).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockFailedRetry).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(1500);
    expect(mockFailedRetry).toHaveBeenCalledTimes(4);
  });

  it("EXPONENTIAL backOff property", async () => {
    const mockFailedRetry = vi.fn();
    const mockPromise = () => Promise.reject("Promise rejected");
    const retryPromiseHandler = new RetryPromiseHandler(mockPromise, {
      retries: 4,
      backOff: "EXPONENTIAL",
      backOffAmount: 10,
      onFailedRetry: mockFailedRetry,
    });

    retryPromiseHandler.start();

    await flushPromises();
    expect(mockFailedRetry).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(10);
    expect(mockFailedRetry).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(100);
    expect(mockFailedRetry).toHaveBeenCalledTimes(3);

    await vi.advanceTimersByTimeAsync(1000);
    expect(mockFailedRetry).toHaveBeenCalledTimes(4);
  });
});
