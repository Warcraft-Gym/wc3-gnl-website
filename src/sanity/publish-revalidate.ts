import type { DocumentActionComponent, DocumentActionsResolver } from "sanity";

/**
 * Makes the Studio's Publish button refresh the site.
 *
 * Wraps Sanity's own publish action: it publishes exactly as before, then asks
 * `/api/revalidate/studio` to purge the pages that show the document. The
 * Studio is mounted on the site itself, so a relative URL reaches it. Twice,
 * a few seconds apart: the publish lands in Sanity asynchronously, and the
 * second call covers a slow write. Failures are ignored on purpose; the
 * webhook and the cache backstop still apply.
 */
function ping(id: string) {
  const send = () =>
    fetch("/api/revalidate/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => undefined);
  setTimeout(send, 3000);
  setTimeout(send, 10000);
}

function withRevalidate(Publish: DocumentActionComponent): DocumentActionComponent {
  const Wrapped: DocumentActionComponent = (props) => {
    const result = Publish(props);
    if (!result || !result.onHandle) return result;
    const onHandle = result.onHandle;
    return {
      ...result,
      onHandle: () => {
        onHandle();
        ping(props.id);
      },
    };
  };
  Wrapped.action = Publish.action;
  return Wrapped;
}

export const resolveDocumentActions: DocumentActionsResolver = (prev) =>
  prev.map((action) => (action.action === "publish" ? withRevalidate(action) : action));
