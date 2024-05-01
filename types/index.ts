export type Configuration<T = unknown> = {
  retries?: number | "INFINITE";
  backOff?: "FIXED" | "LINEAR" | "EXPONENTIAL";
  backOffAmount?: number;
  onSuccess?: (result: T) => void;
  onErrorRetry?: (error: Error) => void;
  onRetryLimitExceeded?: () => void;
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
