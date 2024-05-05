import type { ArrayOfLength, RequiredProperties } from "./helpers";

type CommonRetryConfig<T> = {
  onSuccess?: (result: T) => void;
  onErrorRetry?: (error: unknown, retriesMade: number) => void;
  onRetryStopped?: () => void;
  onRetryLimitExceeded?: () => void;
  shouldRetryOnCondition?: (error: unknown) => boolean;
};

export type DefaultBackOffConfiguration<T, R extends number = number> = {
  retries?: R | "INFINITE";
  backOff?: "FIXED" | "LINEAR" | "EXPONENTIAL";
  backOffAmount?: number;
} & CommonRetryConfig<T>;

export type CustomBackOffConfiguration<T, R extends number> = {
  backOff: "CUSTOM";
  retries: R;
  backOffAmount: ArrayOfLength<R, number>;
} & CommonRetryConfig<T>;

export type Configuration<T, R extends number> =
  | DefaultBackOffConfiguration<T>
  | CustomBackOffConfiguration<T, R>;

export type ConfigurationWithRequiredProperties<T, R extends number> = RequiredProperties<
  T,
  R,
  Configuration<T, R>,
  ["retries", "backOff", "backOffAmount"]
>;
