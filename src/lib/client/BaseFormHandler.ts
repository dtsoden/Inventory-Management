import { useCallback, useState } from 'react';
import { ApiError } from './BaseApiClient';

/**
 * Reusable React hook for form state, validation, and submission.
 *
 * Replaces the per-form duplication of:
 *  - useState for every field
 *  - useState for errors
 *  - useState for submitting / saving
 *  - try/catch around fetch with toast on error
 *  - reset on success
 *
 * Usage:
 *   const form = useFormHandler({
 *     initial: { name: '', email: '' },
 *     validate: (v) => {
 *       if (!v.name) return { name: 'Required' };
 *       return null;
 *     },
 *     submit: (v) => apiClient.post('/vendors', v),
 *     onSuccess: () => router.push('/vendors'),
 *   });
 *
 *   <input value={form.values.name} onChange={(e) => form.setField('name', e.target.value)} />
 *   {form.errors?.name && <p>{form.errors.name}</p>}
 *   <button disabled={form.submitting} onClick={form.submit}>Save</button>
 */

export type FormErrors<T> = {
  [K in keyof T]?: string;
} & {
  _form?: string;
};

export interface FormHandlerOptions<T extends Record<string, unknown>, R> {
  initial: T;
  validate?: (values: T) => FormErrors<T> | null;
  submit: (values: T) => Promise<R>;
  onSuccess?: (result: R) => void | Promise<void>;
  onError?: (error: Error) => void;
}

export interface FormHandler<T extends Record<string, unknown>, R> {
  values: T;
  errors: FormErrors<T> | null;
  submitting: boolean;
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  setValues: (values: T | ((prev: T) => T)) => void;
  reset: () => void;
  submit: () => Promise<R | undefined>;
}

export function useFormHandler<T extends Record<string, unknown>, R = unknown>(
  options: FormHandlerOptions<T, R>,
): FormHandler<T, R> {
  const [values, setValuesState] = useState<T>(options.initial);
  const [errors, setErrors] = useState<FormErrors<T> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setValuesState((prev) => ({ ...prev, [key]: value }));
      // Clear the field-level error as soon as the user edits it.
      setErrors((prev) => {
        if (!prev) return prev;
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const setValues = useCallback((next: T | ((prev: T) => T)) => {
    setValuesState((prev) =>
      typeof next === 'function' ? (next as (p: T) => T)(prev) : next,
    );
  }, []);

  const reset = useCallback(() => {
    setValuesState(options.initial);
    setErrors(null);
    setSubmitting(false);
  }, [options.initial]);

  const submit = useCallback(async (): Promise<R | undefined> => {
    if (submitting) return undefined;
    if (options.validate) {
      const validationErrors = options.validate(values);
      if (validationErrors && Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return undefined;
      }
    }
    setSubmitting(true);
    setErrors(null);
    try {
      const result = await options.submit(values);
      if (options.onSuccess) await options.onSuccess(result);
      return result;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unknown error';
      setErrors({ _form: message } as FormErrors<T>);
      options.onError?.(err instanceof Error ? err : new Error(message));
      return undefined;
    } finally {
      setSubmitting(false);
    }
  }, [values, options, submitting]);

  return { values, errors, submitting, setField, setValues, reset, submit };
}
