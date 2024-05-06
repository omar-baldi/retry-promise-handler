import type { Configuration } from ".";

export type RequiredProperties<
  T,
  R extends number,
  P extends Configuration<T, R>,
  Q extends (keyof P)[]
> = {
  [K in Q[number]]-?: NonNullable<P[K]>;
} & {
  [K in keyof Omit<P, Q[number]>]: P[K];
};

export type PromiseReject<T> = Parameters<Promise<T>["catch"]>[0];

export type ArrayOfLength<L extends number, T, K extends T[] = []> = K["length"] extends L
  ? K
  : ArrayOfLength<L, T, [T, ...K]>;
