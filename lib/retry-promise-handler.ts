export type Configuration<T = unknown> = {
  retries?: number | "INFINITE";
  backOff?: "LINEAR" | "EXPONENTIAL"; //? is there anything more to add for backOff
  backOffAmount?: number;
  onSuccess?: (result: T) => void;
  onErrorRetry?: (error: Error) => void;
};

type RequiredProperties<T, P extends Configuration<T>, Q extends (keyof P)[]> = {
  [K in Q[number]]-?: Required<P[K]>;
} & {
  [K in keyof Omit<P, Q[number]>]: P[K];
};

type UpdatedConfiguration<T> = RequiredProperties<
  T,
  Configuration,
  ["retries", "backOff", "backOffAmount"]
>;

export enum RejectRetryReason {
  ALL_RETRIES_FAILED,
}

export default class RetryPromiseHandler<T> {
  private _retriesMade = 0;
  private _configuration: UpdatedConfiguration<T>;
  private _promise: () => Promise<T>;

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
      backOff: "LINEAR",
      backOffAmount: 1000,
    };
  }

  private get _getRetriesLeft(): number {
    const { retries } = this._configuration;

    return retries === "INFINITE"
      ? Number.MAX_SAFE_INTEGER
      : typeof retries === "number"
      ? Math.max(0, retries - this._retriesMade)
      : 0;
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

  private _handleRetryPromiseRejected(reason: RejectRetryReason): void {}

  private _handleErrorRetryFail(error: Error): void {
    const { onErrorRetry } = this._configuration;

    if (typeof onErrorRetry === "function") {
      onErrorRetry(error);
    }
  }

  private _wait(delay: number): Promise<unknown> {
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  private _recursivelyRetryPromise() {
    const self = this;

    return new Promise<T>((resolve, reject) => {
      function execute() {
        self
          ._promise()
          .then(resolve)
          .catch((error: unknown) => {
            const retriesAmountLeft = self._getRetriesLeft;
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
              //TODO: to replace magic number with delay amount based on "backOff" and "backOffAmount"
              self._wait(1000).then(execute);
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
