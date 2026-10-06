/**
 * The submit forms' alert by the submit button: the check's message, then
 * every message no field shows (`unshownErrors`), each named by where it is,
 * so a rejected form never leaves the author with nothing highlighted.
 */
export function FormAlert({ message, unshown = [] }: { message?: string; unshown?: string[] }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded border border-loss/50 bg-loss/10 px-4 py-3 text-sm text-fg">
      <p>{message}</p>
      {unshown.length ? (
        <ul className="mt-2 space-y-1">
          {unshown.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-loss">·</span>
              {line}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
