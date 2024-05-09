import {
  AllRetriesFailedError,
  ExitConditionMetError,
  RetryError,
  RetryManuallyStoppedError,
} from "@/lib";
import type { ArrayOfLength, RequiredProperties } from "./helpers";

export type RetryStatus = "IDLE" | "STARTED" | "STOPPED";

export type FinalError =
  | AllRetriesFailedError
  | ExitConditionMetError
  | RetryManuallyStoppedError;

type CommonRetryConfig<T> = {
  onSuccess?: (result: T) => void;
  onFailedRetry?: (error: RetryError) => void;
  onFailedRetryProcess?: (error: FinalError) => void;
  shouldRetryOnCondition?: (error: RetryError) => boolean;
};

export type DefaultBackOffConfiguration<T, R extends number = number> = {
  retries?: R | "INFINITE";
  backOff?: "FIXED" | "LINEAR" | "EXPONENTIAL";
  backOffAmount?: number;
} & CommonRetryConfig<T>;

export type CustomBackOffConfiguration<T, R extends number> = {
  retries: R;
  backOff: "CUSTOM";
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
