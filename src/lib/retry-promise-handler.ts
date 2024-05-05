import { isCustomBackOffConfiguration } from "@/helpers";
import type { PromiseReject } from "@/types/helpers";
import { RejectRetryReason, RetryStatus } from "../enums";
import type {
  Configuration,
  ConfigurationWithRequiredProperties,
  CustomBackOffConfiguration,
} from "../types";

export default class RetryPromiseHandler<T, R extends number> {
  private _configuration: ConfigurationWithRequiredProperties<T, R>;
  private _promise: () => Promise<T>;

  private _retriesMade = 0;
  private _retryStatus = RetryStatus.IDLE;
  private _retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private _retryMsRemaining = 0;
  private _startingDateRetry: Date | null = null;
  private _rejectRetryWait: PromiseReject<T>;

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
      backOff: "FIXED",
      retries: 5,
      backOffAmount: 1000,
    } as Pick<
      ConfigurationWithRequiredProperties<T, R>,
      "backOff" | "retries" | "backOffAmount"
    >;
  }

  public get getRetriesRemaining(): number {
    const { retries } = this._configuration;

    return retries === "INFINITE"
      ? Number.MAX_SAFE_INTEGER
      : typeof retries === "number"
      ? Math.max(0, retries - this._retriesMade)
      : 0;
  }

  private get _getTimeRetryRemaining(): number {
    return this._retryMsRemaining;
  }

  private _getCustomBackOffAmountBasedOnCurrentRetry(
    config: CustomBackOffConfiguration<T, R>
  ): number {
    const i = this.getRetriesMade;
    const backOffAmount = (config.backOffAmount as number[])[i];
    return backOffAmount ?? 0;
  }

  //!NOTE: to test
  //!NOTE: to fix type mismatch (see type assertion used)
  private get _getBackOffDelay(): number {
    const config = this._configuration as Configuration<T, R>;

    if (isCustomBackOffConfiguration(config)) {
      return this._getCustomBackOffAmountBasedOnCurrentRetry(config);
    } else {
      const { backOff, backOffAmount = 0 } = config;
      const retriesMade = this.getRetriesMade;

      return backOff === "FIXED"
        ? backOffAmount
        : backOff == "LINEAR"
        ? backOffAmount * retriesMade
        : Math.pow(backOffAmount, retriesMade);
    }
  }

  //!NOTE: to test
  //!NOTE: to fix type mismatch (see type assertion used)
  private get _calculateTimeRetryRemaining(): number {
    const config = this._configuration as Configuration<T, R>;
    const backOffAmount = isCustomBackOffConfiguration(config)
      ? this._getCustomBackOffAmountBasedOnCurrentRetry(config)
      : config.backOffAmount ?? 0;

    const now = new Date();
    const start = this._startingDateRetry ?? new Date();
    const elapsedTime = now.getTime() - start.getTime();
    const remainingTime = backOffAmount - elapsedTime;
    return Math.max(0, remainingTime);
  }

  public get getRetriesMade(): number {
    return this._retriesMade;
  }

  public get isRetryPlaying(): boolean {
    return this._retryStatus === RetryStatus.STARTED;
  }

  public get isRetryPaused(): boolean {
    return this._retryStatus === RetryStatus.PAUSED;
  }

  public get isRetryStopped(): boolean {
    return this._retryStatus === RetryStatus.STOPPED;
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
    const { onRetryLimitExceeded, onRetryStopped } = this._configuration;

    if (
      reason === RejectRetryReason.ALL_RETRIES_FAILED &&
      typeof onRetryLimitExceeded === "function"
    ) {
      onRetryLimitExceeded();
    }

    if (
      reason === RejectRetryReason.RETRY_MANUALLY_STOPPED &&
      typeof onRetryStopped === "function"
    ) {
      onRetryStopped();
    }
  }

  private _handleErrorRetryFail(error: unknown): void {
    const { onErrorRetry } = this._configuration;
    const retriesMade = this.getRetriesMade;

    if (typeof onErrorRetry === "function") {
      onErrorRetry(error, retriesMade);
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
    return new Promise<T>((resolve, reject) => {
      this._promise()
        .then(resolve)
        .catch((err: unknown) => {
          const shouldRetryBasedOnCondition =
            typeof this._configuration.shouldRetryOnCondition === "function"
              ? this._configuration.shouldRetryOnCondition(err)
              : true;

          if (shouldRetryBasedOnCondition) {
            reject(RejectRetryReason.EXIT_CONDITION_MET);
            return;
          }

          const retriesAmountRemaining = this.getRetriesRemaining;
          const hasReachedRetriesLimit = retriesAmountRemaining <= 0;

          if (hasReachedRetriesLimit) {
            reject(RejectRetryReason.ALL_RETRIES_FAILED);
            return;
          }

          const delayAmount = this._getBackOffDelay;
          this._handleErrorRetryFail(err);
          this._increaseRetriesMade();
          this._wait(delayAmount)
            .then(() => this._recursivelyRetryPromise())
            .catch(reject);
        });
    });
  }

  private _restoreState() {
    this._retriesMade = 0;
    this._retryTimeout = null;
    this._retryMsRemaining = 0;
    this._startingDateRetry = null;
    this._rejectRetryWait = null;
  }

  public start() {
    if (this._retryStatus === RetryStatus.STARTED) {
      console.warn("Retry is already running");
      return;
    }

    if (this._retryStatus === RetryStatus.STOPPED) {
      this._restoreState();
    }

    this._retryStatus = RetryStatus.STARTED;

    this._recursivelyRetryPromise()
      .then((response) => this._handleRetryPromiseFulfilled(response))
      .catch((reason) => this._handleRetryPromiseRejected(reason))
      .finally(() => (this._retryStatus = RetryStatus.STOPPED));
  }

  public stop() {
    if (this._retryStatus === RetryStatus.IDLE) {
      return;
    }

    if (this._retryTimeout) {
      clearTimeout(this._retryTimeout);
    }

    if (typeof this._rejectRetryWait === "function") {
      this._rejectRetryWait(RejectRetryReason.RETRY_MANUALLY_STOPPED);
    }
  }

  public resume() {
    if (this._retryStatus !== RetryStatus.PAUSED) {
      console.warn("Cannot resume retry logic");
      return;
    }

    const msRemaining = this._getTimeRetryRemaining;
    this._wait(msRemaining).then(() => this.start());
  }

  public pause() {
    if (this._retryStatus !== RetryStatus.STARTED) {
      console.warn("Cannot pause retry logic");
      return;
    }

    this._retryStatus = RetryStatus.PAUSED;

    if (this._retryTimeout) {
      clearTimeout(this._retryTimeout);
    }

    this._retryMsRemaining = this._calculateTimeRetryRemaining;
  }
}
