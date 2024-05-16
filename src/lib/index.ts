import {
  DEFAULT_BACKOFF,
  DEFAULT_BACKOFF_MS_AMOUNT,
  DEFAULT_RETRIES_AMOUNT,
  RETRY_PROCESS_EXIT_CONDITION_MET_REASON,
  RETRY_PROCESS_FAILED_REASON,
  RETRY_PROCESS_MANUALLY_STOPPED_REASON,
} from "@/constants";
import { isCustomBackOffConfiguration } from "@/helpers/config";
import type {
  Configuration,
  ConfigurationWithRequiredProperties,
  FinalError,
  RetryStatus,
} from "@/types";
import type { PromiseReject } from "@/types/helpers";
export * from "@/helpers/errors";

export class RetryError extends Error {
  reason: string;
  retriesMade: number;
  retriesRemaining: number;
  nativeError: Error;

  constructor(
    error: Error,
    reason: string,
    retriesMade: number,
    retriesRemaining: number
  ) {
    super();
    this.nativeError = error;
    this.reason = reason;
    this.retriesMade = retriesMade;
    this.retriesRemaining = retriesRemaining;
  }
}

export class AllRetriesFailedError extends RetryError {
  constructor(error: Error, retriesMade: number, retriesRemaining: number) {
    super(error, RETRY_PROCESS_FAILED_REASON, retriesMade, retriesRemaining);
  }
}

export class ExitConditionMetError extends RetryError {
  constructor(error: Error, retriesMade: number, retriesRemaining: number) {
    super(error, RETRY_PROCESS_EXIT_CONDITION_MET_REASON, retriesMade, retriesRemaining);
  }
}

export class RetryManuallyStoppedError extends RetryError {
  constructor(error: Error, retriesMade: number, retriesRemaining: number) {
    super(error, RETRY_PROCESS_MANUALLY_STOPPED_REASON, retriesMade, retriesRemaining);
  }
}

export class RetryPromiseHandler<T, R extends number> {
  private _configuration: ConfigurationWithRequiredProperties<T, R>;
  private _promise: () => Promise<T>;

  private _retriesMade = 0;
  private _retryStatus: RetryStatus = "IDLE";
  private _interruptRetryFn: PromiseReject<T>;

  constructor(promise: () => Promise<T>, configuration?: Configuration<T, R>) {
    this._promise = promise;
    this._configuration = {
      ...this._defaultConfigurationOptions,
      ...(configuration ?? {}),
    } as ConfigurationWithRequiredProperties<T, R>;
  }

  private get _defaultConfigurationOptions(): Pick<
    ConfigurationWithRequiredProperties<T, R>,
    "backOff" | "retries" | "backOffAmount"
  > {
    return {
      backOff: DEFAULT_BACKOFF,
      retries: DEFAULT_RETRIES_AMOUNT,
      backOffAmount: DEFAULT_BACKOFF_MS_AMOUNT,
    } as Pick<
      ConfigurationWithRequiredProperties<T, R>,
      "backOff" | "retries" | "backOffAmount"
    >;
  }

  public get retriesRemaining(): number {
    const { retries } = this._configuration;

    return retries === "INFINITE"
      ? Number.MAX_SAFE_INTEGER
      : typeof retries === "number"
      ? Math.max(0, retries - this._retriesMade)
      : 0;
  }

  public get retriesMade(): number {
    return this._retriesMade;
  }

  private get _backOffDelay(): number {
    const config = this._configuration as Configuration<T, R>;

    if (isCustomBackOffConfiguration(config)) {
      const i = this.retriesMade;
      const backOffAmount = (config.backOffAmount as number[])[i];
      return backOffAmount ?? 0;
    }

    const { backOff, backOffAmount = 0 } = config;
    const retriesMade = this.retriesMade;

    return backOff === "FIXED"
      ? backOffAmount
      : backOff == "LINEAR"
      ? backOffAmount * retriesMade
      : Math.pow(backOffAmount, retriesMade);
  }

  public get hasRetryProcessStarted(): boolean {
    return this._retryStatus === "STARTED";
  }

  public get hasRetryProcessStopped(): boolean {
    return this._retryStatus === "STOPPED";
  }

  private set _updateRetryStatus(updatedRetryStatus: RetryStatus) {
    this._retryStatus = updatedRetryStatus;
  }

  private _wait(delay: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, delay);
      this._interruptRetryFn = (reason: unknown) => {
        clearTimeout(timeout);
        reject(reason);
      };
    });
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

  private _handleRetryPromiseRejected(error: FinalError): void {
    const { onFailedRetryProcess } = this._configuration;

    if (typeof onFailedRetryProcess === "function") {
      onFailedRetryProcess(error);
    }
  }

  private _handleErrorRetryFail(error: RetryError): void {
    const { onFailedRetry } = this._configuration;

    if (typeof onFailedRetry === "function") {
      onFailedRetry(error);
    }
  }

  private _shouldRetry(retryError: RetryError): boolean {
    const { shouldRetryOnCondition } = this._configuration;

    return typeof shouldRetryOnCondition === "function"
      ? shouldRetryOnCondition(retryError)
      : true;
  }

  private async _retryPromise() {
    let lastKnownError!: Error;

    while (this.retriesRemaining > 0) {
      try {
        const data = await this._promise();
        return data;
      } catch (err: unknown) {
        this._increaseRetriesMade();

        lastKnownError =
          err instanceof Error ? err : new Error("Unable to resolve promise");

        const retryError = new RetryError(
          lastKnownError,
          "Retry failed",
          this.retriesMade,
          this.retriesRemaining
        );

        const shouldRetry = this._shouldRetry(retryError);

        if (!shouldRetry) {
          throw new ExitConditionMetError(
            lastKnownError,
            this.retriesMade,
            this.retriesRemaining
          );
        }

        this._handleErrorRetryFail(retryError);

        const delay = this._backOffDelay;
        await this._wait(delay).catch(() => {
          throw new RetryManuallyStoppedError(
            lastKnownError,
            this.retriesMade,
            this.retriesRemaining
          );
        });
      }
    }

    throw new AllRetriesFailedError(
      lastKnownError,
      this.retriesMade,
      this.retriesRemaining
    );
  }

  private _restoreState() {
    this._retriesMade = 0;
    this._interruptRetryFn = null;
  }

  public start() {
    if (this.hasRetryProcessStarted) {
      console.warn("Retry is already running");
      return;
    }

    if (this.hasRetryProcessStopped) {
      this._restoreState();
    }

    this._updateRetryStatus = "STARTED";

    this._retryPromise()
      .then((response) => this._handleRetryPromiseFulfilled(response))
      .catch((finalError) => this._handleRetryPromiseRejected(finalError))
      .finally(() => (this._updateRetryStatus = "STOPPED"));
  }

  public stop() {
    if (this.hasRetryProcessStopped) {
      console.warn("Nothing to stop");
      return;
    }

    if (typeof this._interruptRetryFn === "function") {
      this._interruptRetryFn?.("Retry manually stopped");
    }
  }
}
