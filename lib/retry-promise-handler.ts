export type Configuration<T = unknown> = {
  retries?: number | "INFINITE";
  backOff?: "LINEAR" | "EXPONENTIAL"; //? is there anything more to add for backOff
  backOffAmount?: number;
  onSuccess?: (result: T) => void;
  onErrorRetry?: (error: Error, retriesCount: number) => void;
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

  start() {
    const self = this;

    return new Promise<T>((resolve, reject) => {
      function execute() {
        self
          ._promise()
          .then(resolve)
          .catch((error) => {
            const retriesAmountLeft = self._getRetriesLeft;
            const hasReachedRetriesLimit = retriesAmountLeft <= 0;

            if (hasReachedRetriesLimit) {
              //limit exceeded
              reject(error);
            } else {
              //handle error retry
              //increase amount of retries made
              //wait for delay before executing retry once again
            }
          });
      }

      execute();
    });
  }
}

// const r = new RetryPromiseHandler(() => Promise.resolve("Promise fulfilled"), {});
