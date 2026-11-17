import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { SubmitEvent } from 'react';
import { formDataFromSubmit } from '@/lib/forms';

function submitForm(submit: (form: HTMLFormElement) => void) {
  let formData: FormData | undefined;
  render(
    <form
      aria-label="form"
      onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault();
        formData = formDataFromSubmit(event);
      }}
    >
      <input name="name" defaultValue="Ana" />
      <button type="submit" name="intent" value="restore">
        Restore
      </button>
    </form>
  );
  submit(screen.getByRole('form'));
  return formData;
}

describe('formDataFromSubmit', () => {
  test('includes the submitter value when a button submits the form', () => {
    const formData = submitForm(() => fireEvent.click(screen.getByRole('button')));

    expect(formData?.get('name')).toBe('Ana');
    expect(formData?.get('intent')).toBe('restore');
  });

  test('reads only the form fields when there is no submitter', () => {
    const formData = submitForm((form) => fireEvent.submit(form));

    expect(formData?.get('name')).toBe('Ana');
    expect(formData?.has('intent')).toBe(false);
  });
});
