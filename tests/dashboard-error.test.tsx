// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import DashboardError from '../apps/web/src/app/dashboard/error';

it('requests a fresh server render on retry without misclassifying every service failure as Discord', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const container = document.createElement('div');
  const root = createRoot(container);
  const retry = vi.fn();
  try {
    await act(async () => root.render(<DashboardError retry={retry} />));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('A required service');
    expect(container.querySelector('[role="alert"]')?.textContent).not.toContain('Discord');
    expect(retry).not.toHaveBeenCalled();
    await act(async () => container.querySelector('button')!.click());
    expect(retry).toHaveBeenCalledTimes(1);
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
