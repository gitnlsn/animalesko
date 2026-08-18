/**
 * Renders a schema.org graph into the document.
 *
 * The `<` escape is not optional. JSON-LD goes into the page through
 * `dangerouslySetInnerHTML`, and any `</script` sequence that reaches the
 * browser inside the JSON — from a service description, an FAQ answer, anything
 * editable — closes the tag early and turns the rest of the payload into live
 * markup. Escaping the angle bracket keeps the JSON valid and the injection
 * impossible.
 */
export function JsonLd({ schema }: { schema: object | object[] }) {
  const payload = JSON.stringify(schema).replace(/</g, "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: payload }} />;
}
