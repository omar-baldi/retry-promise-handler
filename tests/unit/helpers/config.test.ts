import { isCustomBackOffConfiguration } from "@/helpers/config";

describe("isCustomBackOffConfiguration", () => {
  it("should return true if configuration backOff property is set to 'CUSTOM'", () => {
    const isCustomConfig = isCustomBackOffConfiguration({
      backOff: "CUSTOM",
      retries: 1,
      backOffAmount: [1000],
    });

    expect(isCustomConfig).toBe(true);
  });

  it("should return false if configuration backOff property is not set to 'CUSTOM'", () => {
    const isCustomConfig = isCustomBackOffConfiguration({
      backOff: "EXPONENTIAL",
    });

    expect(isCustomConfig).not.toBe(true);
  });
});
