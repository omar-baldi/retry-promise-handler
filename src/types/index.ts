export type Configuration<T = unknown> = {
  retries?: number | "INFINITE";
  backOff?: "FIXED" | "LINEAR" | "EXPONENTIAL";
  backOffAmount?: number;
  onSuccess?: (result: T) => void;
  onErrorRetry?: (error: Error) => void;
  onRetryStopped?: () => void;
  onRetryLimitExceeded?: () => void;
  /**
   * Allows users to define a custom function that determines whether
   * a retry attempt should be made based on the error encountered
   * during the attempt.
   * For example, users might want to retry only for specific error codes
   * or error types, or based on certain properties of the error object.
   */
  shouldRetryOnError?: (error: Error) => boolean;
};

type RequiredProperties<T, P extends Configuration<T>, Q extends (keyof P)[]> = {
  [K in Q[number]]-?: NonNullable<P[K]>;
} & {
  [K in keyof Omit<P, Q[number]>]: P[K];
};

export type UpdatedConfiguration<T> = RequiredProperties<
  T,
  Configuration,
  ["retries", "backOff", "backOffAmount"]
>;

export type PromiseReject<T> = Parameters<Promise<T>["catch"]>[0];
