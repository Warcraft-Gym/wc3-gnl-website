/** Renders a schema.org object as a JSON-LD script. Values are serialised
 *  with `<` escaped so content can never break out of the script tag. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
