export enum RejectRetryReason {
  ALL_RETRIES_FAILED,
  RETRY_MANUALLY_STOPPED,
  EXIT_CONDITION_MET,
}

export enum RetryStatus {
  IDLE,
  STARTED,
  PAUSED,
  STOPPED,
}
