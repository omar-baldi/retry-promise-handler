export type CommonConfiguration<T> = {
  backOffAmount?: number;
  onSuccess?: (result: T) => void;
  onErrorRetry?: (error: unknown, retriesMade: number) => void;
  onRetryStopped?: () => void;
  onRetryLimitExceeded?: () => void;
  shouldRetryOnCondition?: (error: unknown) => boolean;
};

//TODO: to rename
export type ToRenameBackOff = {
  retries?: number | "INFINITE";
  backOff?: "FIXED" | "LINEAR" | "EXPONENTIAL";
};

//TODO: to rename
export type CustomArrayBackOff<T extends number = number> = {
  retries?: T;
  backOff?: readonly [number, ...number[]] & { length: T };
};

//TODO: to rename
export type ConfigurationDefault<T> = ToRenameBackOff & CommonConfiguration<T>;
//TODO: to rename
export type ConfigurationArrayBackOff<T> = CustomArrayBackOff & CommonConfiguration<T>;

export type Configuration<T> = ConfigurationDefault<T> | ConfigurationArrayBackOff<T>;

type RequiredProperties<T, P extends Configuration<T>, Q extends (keyof P)[]> = {
  [K in Q[number]]-?: NonNullable<P[K]>;
} & {
  [K in keyof Omit<P, Q[number]>]: P[K];
};

export type UpdatedConfiguration<T> = RequiredProperties<
  T,
  Configuration<T>,
  ["retries", "backOff", "backOffAmount"]
>;

export type PromiseReject<T> = Parameters<Promise<T>["catch"]>[0];
