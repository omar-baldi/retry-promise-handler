import type { Configuration, CustomBackOffConfiguration } from "@/types";

export function isCustomBackOffConfiguration<T, R extends number>(
  config: Configuration<T, R>
): config is CustomBackOffConfiguration<T, R> {
  return config.backOff === "CUSTOM";
}
