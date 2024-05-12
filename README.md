# retry-promise-handler

<hr />

## About

_retry-promise-handler_ is a package designed to facilitate retrying promises with various backoff strategies. It provides flexibility in configuring the number of retries, backoff strategies, and callbacks for success and failure.

## Getting Started

Install with npm:
`npm install retry-promise-handler`

Then you can import it with:

```typescript
import { RetryPromiseHandler } from "retry-promise-handler";

const promise = () => Promise.resolve("Promise fulfilled");
const pHandler = new RetryPromiseHandler(promise, {
  retries: 3,
  backOff: "CUSTOM",
  backOffAmount: [500, 500, 1000],
});
```

To initiate the retry process, simply call pHandler.start() after configuring the RetryPromiseHandler.

```typescript
pHandler.start();
```

Depending on your use case, you can manually stop the retry process if needed. If you choose to stop the retry process manually, you can call

```typescript
pHandler.stop();
```

## Configuration Options

_retry-promise-handler_ offers two types of configurations: default and custom.

#### Default configuration

The default configuration provides a simpler approach to retrying promises. It allows you to specify the number of retries, the backoff strategy, and optional callback functions for different events.

```typescript
export type DefaultBackOffConfiguration<T, R extends number> = {
  retries?: R | "INFINITE";
  backOff?: "FIXED" | "LINEAR" | "EXPONENTIAL";
  backOffAmount?: number;
  onSuccess?: (result: T) => void;
  onFailedRetry?: (error: RetryError) => void;
  onFailedRetryProcess?: (error: FinalError) => void;
  shouldRetryOnCondition?: (error: RetryError) => boolean;
};
```

- **_retries_**: specifies the number of retries or "INFINITE" for unlimited retries.
- **_backOff_**: defines the backoff strategy, which can be "FIXED", "LINEAR", or "EXPONENTIAL".
- **_backOffAmount_**: Specifies the amount of time to wait between retries.
- **_onSuccess_**: optional callback function executed upon successful promise fulfillment.
- **_onFailedRetry_**: optional callback function executed when a retry fails.
- **_onFailedRetryProcess_**: optional callback function executed when all retries fail.
- **_shouldRetryOnCondition_**: optional function that determines whether to retry. It should return a boolean value, indicating whether or not to retry, based on any relevant condition.

#### Custom configuration

The custom configuration allows for more fine-grained control over retry behavior. It specifies the exact number of retries and requires an array of custom backoff times, where each element in the array represents the amount of time to wait before each retry.

```typescript
export type CustomBackOffConfiguration<T, R extends number> = {
  retries: R;
  backOff: "CUSTOM";
  backOffAmount: ArrayOfLength<R, number>;
  onSuccess?: (result: T) => void;
  onFailedRetry?: (error: RetryError) => void;
  onFailedRetryProcess?: (error: FinalError) => void;
  shouldRetryOnCondition?: (error: RetryError) => boolean;
};
```

- **_retries_**: specifies the exact number of retries.
- **_backOff_**: indicates the use of a custom backoff strategy, which is set to "CUSTOM".
- **_backOffAmount_**: Requires an array of length R containing custom backoff times. Each element in the array represents the amount of time to wait before retrying.
- **_onSuccess_**, **_onFailedRetry_**, **_onFailedRetryProcess_**, **_shouldRetryOnCondition_**: Optional callbacks, same as in the default configuration.

## Contributing

Whether you want to report a bug, request a feature or submit a pull request, your contribution is **greatly appreciated**.

Don't forget to show your support by giving the project a star!

## License

Distributed under the MIT License. See `LICENSE` for more information.
