'use client';

import { startTransition, useActionState, useEffect, useRef } from 'react';
import { unstable_rethrow } from 'next/navigation';

type SaveState = {
  success?: boolean;
  formError?: string;
};

export function useSaveAction<State extends SaveState>(
  action: (previous: State, data: FormData) => Promise<State>,
  initialState: State,
  errorMessage: string
) {
  const completion = useRef<((saved: boolean) => void) | null>(null);
  const [state, dispatch, pending] = useActionState(
    async (previous: State, data: FormData): Promise<State> => {
      let saved = false;
      try {
        const result = await action(previous, data);
        saved = result.success === true;
        return result;
      } catch (error) {
        unstable_rethrow(error);
        return { ...initialState, formError: errorMessage };
      } finally {
        const resolve = completion.current;
        completion.current = null;
        resolve?.(saved);
      }
    },
    initialState as Awaited<State>
  );

  useEffect(
    () => () => {
      completion.current?.(false);
      completion.current = null;
    },
    []
  );

  function submit(data: FormData): Promise<boolean> {
    if (completion.current) return Promise.resolve(false);
    return new Promise((resolve) => {
      completion.current = resolve;
      startTransition(() => dispatch(data));
    });
  }

  return [state, submit, pending] as const;
}
