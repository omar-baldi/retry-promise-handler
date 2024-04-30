export type Configuration<T = unknown> = {
  retries?: number | "INFINITE";
  backOff?: "LINEAR" | "EXPONENTIAL"; //? is there anything more to add for backOff
  backOffAmount?: number;
  onSuccess?: (result: T) => void;
  onErrorRetry?: (error: Error, retriesCount: number) => void;
};

export default class RetryPromiseHandler<T> {
  _retriesMade = 0;
  _configuration: Configuration<T>;
  _promise: () => Promise<T>;

  constructor(promise: () => Promise<T>, configuration: Configuration<T>) {
    this._promise = promise;
    this._configuration = configuration;
  }

  private _getRetriesLeft(): number {
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
            const retriesAmountLeft = self._getRetriesLeft();
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
