"use client";

import { useEffect, useRef, useState } from "react";

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
  const form = useRef<HTMLFormElement | null>(null);

  // Once the messages render, bring the topmost one into view: the first
  // problem (a race, the stops) is often far above the submit button and
  // has no text field to focus. Field messages are the forms' `p.text-loss`;
  // with none, every message is in the alert by the button.
  useEffect(() => {
    if (!fields) return;
    const target = form.current?.querySelector("p.text-loss") ?? form.current?.querySelector("[role=alert]");
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [fields]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const found = check(new FormData(e.currentTarget));
    setFields(found);
    if (!found) return;
    e.preventDefault();
    form.current = e.currentTarget;
    // Keyboard focus goes to the first text field with a message (its id is its name); the
    // effect above does the scrolling, as the first message may sit on a race or the stops.
    const field = Object.keys(found).map((key) => document.getElementById(key)).find(Boolean);
    field?.focus({ preventScroll: true });
  };
  return { fields, onSubmit };
}
