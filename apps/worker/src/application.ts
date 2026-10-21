import { scaffoldStatus } from '@navi/core';

/** Idle/smoke descriptor; enabled monitoring is initialized separately in index.ts. */
export function createWorker() {
  return scaffoldStatus('worker');
}
