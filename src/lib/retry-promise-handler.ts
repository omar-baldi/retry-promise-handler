import { RejectRetryReason, RetryStatus } from "../enums";
import type { Configuration, PromiseReject, UpdatedConfiguration } from "../types";

export default class RetryPromiseHandler<T = unknown> {
  private _configuration: UpdatedConfiguration<T>;
  private _promise: () => Promise<T>;

  private _retriesMade = 0;
  private _retryStatus = RetryStatus.IDLE;
  private _retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private _retryMsRemaining = 0;
  private _startingDateRetry: Date | null = null;
  private _rejectRetryWait: PromiseReject<T>;

  constructor(promise: () => Promise<T>, configuration?: Configuration<T>) {
    this._promise = promise;
    this._configuration = {
      ...this._defaultConfigurationOptions,
      ...(configuration ?? {}),
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

  private get _getBackOffDelay(): number {
    const { backOff, backOffAmount } = this._configuration;
    const retriesMade = this.getRetriesMade;

    return backOff === "FIXED"
      ? backOffAmount
      : backOff == "LINEAR"
      ? backOffAmount * retriesMade
      : Math.pow(backOffAmount, retriesMade);
  }

  private get _calculateTimeRetryRemaining(): number {
    const { backOffAmount } = this._configuration;
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
            const err =
              error instanceof Error
                ? error
                : new Error("Retry failed: could not resolve promise");

            self._increaseRetriesMade();

            const shouldExitOnError =
              typeof self._configuration.shouldRetryOnError === "function"
                ? self._configuration.shouldRetryOnError(err)
                : false;

            if (shouldExitOnError) {
              reject(RejectRetryReason.ERROR_CONDITION_MET);
              return;
            }

            const retriesAmountRemaining = self.getRetriesRemaining;
            const hasReachedRetriesLimit = retriesAmountRemaining <= 0;

            if (hasReachedRetriesLimit) {
              reject(RejectRetryReason.ALL_RETRIES_FAILED);
              return;
            }

            self._handleErrorRetryFail(err);
            const delayAmount = self._getBackOffDelay;
            self._wait(delayAmount).then(execute).catch(reject);
          });
      }

      execute();
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

const maxRetries = 10;
var retries = 0;

function getPokemonList() {
  const url = "https://pokeapi.co/api/v2/pokemon";
  return fetch(url)
    .then<{ results: { name: string; url: string }[] }>((response) => {
      if (!response.ok || retries < maxRetries - 1) {
        throw new Error("Unable to get pokemon list");
      }

      return response.json();
    })
    .then((data) => data.results);
}

const retryPromiseHandler = new RetryPromiseHandler(getPokemonList, {
  backOff: "FIXED",
  onErrorRetry: (err) => {
    console.error("ERROR: ", err);
    console.log("*------------------------------*");
    ++retries;
  },
  onSuccess: (data) => console.log("POKEMON LIST: ", data),
  retries: 10,
  backOffAmount: 500,
});

retryPromiseHandler.start();
