import 'server-only';
import { redirect } from 'next/navigation';
import { AppError } from './errors';
export function handlePageError(error: unknown): never {
  if (error instanceof AppError && error.status === 401) redirect('/login?error=session');
  if (error instanceof AppError && error.status === 403) redirect('/access-denied');
  throw error;
}
