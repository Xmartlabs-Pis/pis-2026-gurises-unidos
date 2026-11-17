import type { SubmitEvent } from 'react';

export function formDataFromSubmit(event: SubmitEvent<HTMLFormElement>) {
  const { submitter } = event.nativeEvent;
  return submitter
    ? new FormData(event.currentTarget, submitter)
    : new FormData(event.currentTarget);
}
