import type { Configuration, ConfigurationArrayBackOff } from "@/types";

//TODO: better function naming
export function isConfigurationWithCustomBackOffArray<T>(
  configuration: Configuration<T>
): configuration is ConfigurationArrayBackOff<T> {
  return Array.isArray(configuration.backOff);
}
