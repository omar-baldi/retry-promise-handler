import { RejectRetryReason } from "../enums";
import type { Configuration, UpdatedConfiguration } from "../types";

export default class RetryPromiseHandler<T> {
  private _configuration: UpdatedConfiguration<T>;
  private _promise: () => Promise<T>;

  private _retriesMade = 0;
  private _retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private _retryMsRemaining = 0;
  private _startingDateRetry: Date | null = null;
  private _rejectRetryWait: ((reason?: unknown) => void) | null = null;

  constructor(promise: () => Promise<T>, configuration: Configuration<T>) {
    this._promise = promise;
    this._configuration = {
      ...this._defaultConfigurationOptions,
      ...configuration,
    } as UpdatedConfiguration<T>;
  }

  private get _defaultConfigurationOptions(): Pick<
    UpdatedConfiguration<T>,
    "retries" | "backOff" | "backOffAmount"
  > {
    return {
      retries: 5,
      backOff: "FIXED",
      backOffAmount: 1000,
    };
  }

  private get _calculateRetriesLeft(): number {
    const { retries } = this._configuration;

    return retries === "INFINITE"
      ? Number.MAX_SAFE_INTEGER
      : typeof retries === "number"
      ? Math.max(0, retries - this._retriesMade)
      : 0;
  }

  private get _getRetriesMade(): number {
    return this._retriesMade;
  }

  private get _calculateBackOffDelay(): number {
    const { backOff, backOffAmount } = this._configuration;
    const retriesMade = this._getRetriesMade;

    return backOff === "FIXED"
      ? backOffAmount
      : backOff == "LINEAR"
      ? backOffAmount * retriesMade
      : Math.pow(backOffAmount, retriesMade);
  }

  private _increaseRetriesMade(): void {
    this._retriesMade += 1;
  }

  private _handleRetryPromiseFulfilled(response: T): void {
    const { onSuccess } = this._configuration;

    if (typeof onSuccess === "function") {
      onSuccess(response);
    }
  }

  private _handleRetryPromiseRejected(reason: RejectRetryReason): void {
    const { onRetryLimitExceeded } = this._configuration;

    if (
      reason === RejectRetryReason.ALL_RETRIES_FAILED &&
      typeof onRetryLimitExceeded === "function"
    ) {
      onRetryLimitExceeded();
    }
  }

  private _handleErrorRetryFail(error: Error): void {
    const { onErrorRetry } = this._configuration;

    if (typeof onErrorRetry === "function") {
      onErrorRetry(error);
    }
  }

  private _wait(delay: number): Promise<unknown> {
    this._startingDateRetry = new Date();

    return new Promise((resolve, reject) => {
      this._rejectRetryWait = reject;
      this._retryTimeout = setTimeout(resolve, delay);
    });
  }

  private _recursivelyRetryPromise() {
    const self = this;

    return new Promise<T>((resolve, reject) => {
      function execute() {
        self
          ._promise()
          .then(resolve)
          .catch((error: unknown) => {
            const retriesAmountLeft = self._calculateRetriesLeft;
            const hasReachedRetriesLimit = retriesAmountLeft <= 0;

            if (hasReachedRetriesLimit) {
              reject(RejectRetryReason.ALL_RETRIES_FAILED);
            } else {
              const err =
                error instanceof Error
                  ? error
                  : new Error("Retry failed: could not resolve promise");

              self._handleErrorRetryFail(err);
              self._increaseRetriesMade();

              const delayAmount = self._calculateBackOffDelay;
              self._wait(delayAmount).then(execute).catch(reject);
            }
          });
      }

      execute();
    });
  }

  public start() {
    this._recursivelyRetryPromise()
      .then((response) => this._handleRetryPromiseFulfilled(response))
      .catch((reason) => this._handleRetryPromiseRejected(reason));
  }
}
