/**
 * LLM function signature used by {@link LLMRoutingStrategy} and by the
 * "use a chat model to judge where this message belongs" path of the
 * Clinic facade.
 *
 * The function receives a fully-formed prompt (Doctor Chaos's job to
 * build) and must return the model's reply text. Doctor Chaos parses
 * the reply to extract a routing decision.
 *
 * Implementations are expected to handle their own authentication,
 * base URLs, retries, and rate limiting. They should throw on
 * transport failures so the facade can fall back gracefully; they
 * should NOT retry internally unless that is genuinely cheap for
 * their provider.
 *
 * Keeping the signature `(prompt) => Promise<string>` instead of
 * `(messages[]) => ...` deliberately trades flexibility for
 * simplicity: every provider's raw chat completion API can be wrapped
 * in three or four lines by a user or an adapter package.
 */
export type LLMFunction = (prompt: string) => Promise<string>;

/**
 * Embedding function signature. Takes a batch of texts and returns a
 * batch of vectors (one per input text, in the same order).
 *
 * This is the universal shape every embedding provider's API can be
 * reduced to. Adapter packages (`@doctorchaos-ai/openai`, etc.) export
 * pre-built implementations; users can also write their own in a few
 * lines for custom providers or local models.
 */
export type EmbedFunction = (texts: readonly string[]) => Promise<number[][]>;
