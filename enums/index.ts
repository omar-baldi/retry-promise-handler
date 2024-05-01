export enum RejectRetryReason {
  ALL_RETRIES_FAILED,
  RETRY_MANUALLY_STOPPED,
}

export enum RetryStatus {
  IDLE,
  STARTED,
  PAUSED,
  STOPPED,
}
