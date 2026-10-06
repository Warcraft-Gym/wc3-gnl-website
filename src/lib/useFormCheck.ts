"use client";

import { useState } from "react";

/** The message a submit form shows by its button when fields need fixing; the server action's own. */
export const FIX_FIELDS_MESSAGE = "Please fix the highlighted fields.";

/**
 * Checks a submit form in the browser before its server action runs, against
 * the same schema the action parses with, so an empty or half-filled form
 * shows its messages at once instead of after a round trip. The action still
 * checks everything; this only saves the trip. `check` returns field messages
 * keyed like the action's ("title", "steps.2.instruction"), or null when the
 * form is good to send.
 *
 * `onSubmit` goes on the `<form>` next to `action`: a `preventDefault` there
 * stops React from running the action. `fields` is the last check's messages,
 * null once a check passes, so the action's own result shows again.
 */
export function useFormCheck(check: (data: FormData) => Record<string, string> | null) {
  const [fields, setFields] = useState<Record<string, string> | null>(null);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const found = check(new FormData(e.currentTarget));
    setFields(found);
    if (!found) return;
    e.preventDefault();
    // A text field's id is its name; a step or stop key matches none and focus stays put.
    document.getElementById(Object.keys(found)[0])?.focus();
  };
  return { fields, onSubmit };
}
