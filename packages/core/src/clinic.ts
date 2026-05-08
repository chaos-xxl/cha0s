import {
  defaultRoutingConfiguration,
  type RoutingConfiguration,
} from './config/routing-configuration.js';
import { extractKeywords } from './keywords/extract-keywords.js';
import { CorrectionLearner, type CorrectionLearnerOptions } from './learning/correction-learner.js';
import {
  PackagingExecutor,
  type PackagingExecutorOptions,
} from './lifecycle/packaging-executor.js';
import {
  TopicSpaceLifecycleManager,
  type LifecycleManagerOptions,
} from './lifecycle/topic-space-lifecycle-manager.js';
import {
  RoutingEngine,
  type RoutingDecision,
  type RoutingEngineOptions,
} from './routing/routing-engine.js';
import { KeywordClusteringStrategy } from './strategies/keyword-clustering-strategy.js';
import type { ClusteringStrategy } from './strategies/interfaces.js';
import type { Fragment } from './types/fragment.js';
import type { FragmentCluster } from './types/fragment-cluster.js';
import type { InboxSpace } from './types/inbox-space.js';
import { addFragment, createInboxSpace, removeFragments } from './types/inbox-space.js';
import type { Message } from './types/message.js';
import type { Id } from './types/primitives.js';
import type { RoutingCorrection } from './types/routing-correction.js';
import type { TopicSpace, TopicStatus } from './types/topic-space.js';

/**
 * Options for constructing a {@link Clinic} instance.
 *
 * All fields are optional. The zero-argument default gives you a fully
 * working in-memory instance suitable for quick experiments, tests,
 * and the CLI demo.
 */
export interface ClinicOptions {
  /**
   * Tuning knobs for routing, clustering, and lifecycle. Overrides
   * {@link defaultRoutingConfiguration} wherever provided.
   */
  readonly configuration?: RoutingConfiguration;

  /**
   * Advanced: override the routing engine entirely. Most users should
   * leave this unset and plug in individual strategies via
   * `engineOptions` instead.
   */
  readonly engine?: RoutingEngine;

  /**
   * Strategy plug-ins for the default routing engine. Ignored when
   * `engine` is provided directly.
   */
  readonly engineOptions?: Omit<RoutingEngineOptions, 'configuration'>;

  /**
   * Clustering strategy used by {@link Clinic.checkPackaging}. Defaults
   * to {@link KeywordClusteringStrategy}.
   */
  readonly clusteringStrategy?: ClusteringStrategy;

  /**
   * Forwarded to the {@link TopicSpaceLifecycleManager}.
   */
  readonly lifecycleOptions?: Omit<LifecycleManagerOptions, 'configuration'>;

  /**
   * Forwarded to the {@link PackagingExecutor}.
   */
  readonly packagingOptions?: PackagingExecutorOptions;

  /**
   * Forwarded to the {@link CorrectionLearner}.
   */
  readonly correctionOptions?: CorrectionLearnerOptions;

  /**
   * Seed topic spaces (e.g. rehydrated from storage).
   */
  readonly initialSpaces?: readonly TopicSpace[];

  /**
   * Seed inbox (e.g. rehydrated from storage).
   */
  readonly initialInbox?: InboxSpace;

  /**
   * Function that generates ids for new messages and fragments the
   * facade creates internally. Replace with UUIDs or host-provided
   * ids if you prefer.
   */
  readonly idGenerator?: () => Id;

  /**
   * Clock used for message timestamps on outgoing side (e.g. when a
   * message arrives without its own `timestamp`). Default: `new Date()`.
   */
  readonly clock?: () => Date;
}

/**
 * Input shape accepted by {@link Clinic.send}.
 *
 * Callers may pass a fully-formed {@link Message} (with id and
 * timestamp) or a minimal `{ role, content }` object — the facade
 * fills in the missing fields.
 */
export type ClinicInput =
  | Message
  | {
      readonly role: Message['role'];
      readonly content: string;
      readonly id?: Id;
      readonly timestamp?: Date;
    };

/**
 * Result of a single {@link Clinic.send} call.
 *
 * Regardless of which branch the router picked (existing space, new
 * space, inbox), the returned object tells the caller:
 *   - *where* the message ended up (`destination`),
 *   - *the updated target* (space or inbox),
 *   - *why* the router decided this (`reasoning`, `confidence`),
 *   - *whether a new space was born* from this call (`isNewSpace`).
 */
export type SendResult =
  | {
      readonly destination: 'topicSpace';
      readonly space: TopicSpace;
      readonly isNewSpace: boolean;
      readonly message: Message;
      readonly decision: RoutingDecision;
    }
  | {
      readonly destination: 'inbox';
      readonly inbox: InboxSpace;
      readonly fragment: Fragment;
      readonly message: Message;
      readonly decision: RoutingDecision;
    };

/**
 * The top-level public API of Doctor Chaos.
 *
 * The clinic opens its doors, triages every incoming message, and
 * routes each one to the appropriate specialty — or lets it rest in
 * the general practice waiting room until a clearer diagnosis emerges.
 * Patients are not asked to self-diagnose.
 *
 * ## Design principles
 *
 * 1. **One object.** Applications hold one `Clinic` instance per
 *    user/session and talk to it through methods named like verbs
 *    (`send`, `moveMessage`) or short nouns (`spaces`, `inbox`).
 *
 * 2. **Async methods throughout.** Even methods that resolve
 *    synchronously today return Promises, because adapter-backed
 *    strategies will require network IO. Keeping the signatures
 *    consistent avoids future breaking changes.
 *
 * 3. **Errors are exceptions.** The facade throws on misuse
 *    (unknown ids, etc.). Well-behaved host applications should
 *    validate inputs and wrap in try/catch where needed.
 *
 * 4. **Stateful, not eternal.** The facade keeps state in-memory. For
 *    persistence, snapshot {@link Clinic.snapshot} and hydrate via
 *    `initialSpaces` / `initialInbox` / `correctionOptions.corrections`
 *    on restart.
 *
 * ## Example
 *
 * ```ts
 * import { Clinic } from '@doctorchaos-ai/core';
 *
 * const clinic = new Clinic();
 *
 * const result = await clinic.send({
 *   role: 'user',
 *   content: 'Book me a flight to Kyoto next week.',
 * });
 *
 * if (result.destination === 'topicSpace') {
 *   console.log(`Landed in space: ${result.space.name}`);
 * } else {
 *   console.log('Stashed in inbox.');
 * }
 * ```
 */
export class Clinic {
  private readonly configuration: RoutingConfiguration;
  private readonly engine: RoutingEngine;
  private readonly clustering: ClusteringStrategy;
  private readonly lifecycle: TopicSpaceLifecycleManager;
  private readonly packaging: PackagingExecutor;
  private readonly learner: CorrectionLearner;
  private readonly idGenerator: () => Id;
  private readonly clock: () => Date;

  private spacesById: Map<Id, TopicSpace>;
  private inboxState: InboxSpace;

  constructor(options: ClinicOptions = {}) {
    this.configuration = options.configuration ?? defaultRoutingConfiguration;
    this.idGenerator = options.idGenerator ?? defaultIdGenerator;
    this.clock = options.clock ?? (() => new Date());

    this.engine =
      options.engine ??
      new RoutingEngine({
        ...(options.engineOptions ?? {}),
        configuration: this.configuration,
      });

    this.clustering =
      options.clusteringStrategy ?? new KeywordClusteringStrategy(this.configuration);

    this.lifecycle = new TopicSpaceLifecycleManager({
      ...(options.lifecycleOptions ?? {}),
      configuration: this.configuration,
    });

    this.packaging = new PackagingExecutor({
      idGenerator: this.idGenerator,
      clock: this.clock,
      ...(options.packagingOptions ?? {}),
    });

    this.learner = new CorrectionLearner(options.correctionOptions);

    this.spacesById = new Map();
    for (const space of options.initialSpaces ?? []) {
      this.spacesById.set(space.id, space);
    }
    this.inboxState = options.initialInbox ?? createInboxSpace();
  }

  // ─── Primary actions ──────────────────────────────────────────────

  /**
   * Route a single incoming message.
   *
   * Internally:
   *   1. Normalises the input into a full {@link Message}.
   *   2. Runs {@link RoutingEngine.route} against the current spaces.
   *   3. Applies the decision: append to an existing space, open a new
   *      space, or stash the message in the inbox as a fragment.
   *   4. Updates `lastActivityDate` on the affected space.
   */
  async send(input: ClinicInput): Promise<SendResult> {
    const message = this.normaliseMessage(input);
    const now = message.timestamp;
    const activeSpaces = [...this.spacesById.values()];
    const decision = await this.engine.route(
      message.content,
      activeSpaces,
      this.inboxState.fragments,
      now,
    );

    switch (decision.destination.kind) {
      case 'existingTopicSpace': {
        const updated = this.appendToSpace(decision.destination.topicSpace.id, message);
        return {
          destination: 'topicSpace',
          space: updated,
          isNewSpace: false,
          message,
          decision,
        };
      }
      case 'newTopicSpace': {
        const newSpace = this.createSpace(decision.destination.suggestedName, message);
        return {
          destination: 'topicSpace',
          space: newSpace,
          isNewSpace: true,
          message,
          decision,
        };
      }
      case 'inbox': {
        const fragment = this.pushToInbox(message);
        return {
          destination: 'inbox',
          inbox: this.inboxState,
          fragment,
          message,
          decision,
        };
      }
    }
  }

  /**
   * Move a specific message from wherever it currently lives to a
   * target topic space. Records a {@link RoutingCorrection} so the
   * learner can adjust future routing.
   */
  async moveMessage(messageId: Id, toSpaceId: Id): Promise<TopicSpace> {
    const target = this.spacesById.get(toSpaceId);
    if (!target) {
      throw new Error(`moveMessage: unknown target space ${toSpaceId}`);
    }

    const location = this.locateMessage(messageId);
    if (!location) {
      throw new Error(`moveMessage: unknown message ${messageId}`);
    }

    if (location.kind === 'space' && location.spaceId === toSpaceId) {
      return target;
    }

    // Remove from the source.
    let movedMessage: Message;
    let originalDestination: string;
    if (location.kind === 'space') {
      const source = this.spacesById.get(location.spaceId);
      if (!source) throw new Error(`moveMessage: source space ${location.spaceId} vanished`);
      movedMessage = source.messages.find((m) => m.id === messageId)!;
      const updatedSource: TopicSpace = {
        ...source,
        messages: source.messages.filter((m) => m.id !== messageId),
      };
      this.spacesById.set(source.id, updatedSource);
      originalDestination = source.id;
    } else {
      const fragment = this.inboxState.fragments.find((f) => f.id === location.fragmentId)!;
      movedMessage = fragment.messages.find((m) => m.id === messageId)!;
      const remaining = fragment.messages.filter((m) => m.id !== messageId);
      if (remaining.length === 0) {
        const [updated] = removeFragments(this.inboxState, new Set([fragment.id]));
        this.inboxState = updated;
      } else {
        const slimmer: Fragment = { ...fragment, messages: remaining };
        const withoutOriginal = {
          ...this.inboxState,
          fragments: this.inboxState.fragments.map((f) => (f.id === fragment.id ? slimmer : f)),
          totalMessageCount: this.inboxState.totalMessageCount - 1,
        };
        this.inboxState = withoutOriginal;
      }
      originalDestination = 'inbox';
    }

    // Append to the target. Update lastActivityDate to the moved
    // message's timestamp or now, whichever is later.
    const tipTime = Math.max(movedMessage.timestamp.getTime(), target.lastActivityDate.getTime());
    const updatedTarget: TopicSpace = {
      ...target,
      messages: [...target.messages, movedMessage].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
      ),
      lastActivityDate: new Date(tipTime),
    };
    this.spacesById.set(updatedTarget.id, updatedTarget);

    // Record the correction.
    this.learner.record({
      id: this.idGenerator(),
      messageId,
      originalDestination,
      correctedDestination: toSpaceId,
      timestamp: this.clock(),
      messageContent: movedMessage.content,
    });

    return updatedTarget;
  }

  /**
   * Inspect the inbox, find any cluster dense enough to qualify for
   * packaging, and promote each qualifying cluster into a new topic
   * space.
   *
   * Safe to call periodically (for example, after every N messages).
   * Returns the list of newly created spaces; if nothing qualifies,
   * returns an empty list.
   */
  async checkPackaging(): Promise<TopicSpace[]> {
    const created: TopicSpace[] = [];

    // Loop because one packaging pass may leave other clusters still
    // qualifying; we keep going until no cluster clears the bar.
    // We cap iterations to avoid runaway on pathological inputs.
    const MAX_PASSES = 8;
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const clusters = this.clustering.evaluateClusters(this.inboxState.fragments);
      const qualifying: FragmentCluster[] = clusters.filter((c) =>
        this.clustering.meetsPackagingThreshold(c),
      );
      if (qualifying.length === 0) break;

      // Take only the first qualifying cluster per pass: consecutive
      // passes will re-evaluate, and merging greed in the strategy
      // means doing them one at a time keeps invariants clean.
      const cluster = qualifying[0]!;
      const { newSpace, updatedInbox } = this.packaging.execute(cluster, this.inboxState);
      this.inboxState = updatedInbox;
      this.spacesById.set(newSpace.id, newSpace);
      created.push(newSpace);
    }

    return created;
  }

  /**
   * Run the lifecycle manager and apply its recommendations. Currently
   * this archives spaces that have been inactive beyond the configured
   * threshold. Returns the list of spaces that changed.
   */
  async checkLifecycle(): Promise<TopicSpace[]> {
    const actions = this.lifecycle.evaluate([...this.spacesById.values()]);
    const changed: TopicSpace[] = [];
    for (const action of actions) {
      if (action.kind === 'archive') {
        const updated = this.lifecycle.archive(action.space);
        this.spacesById.set(updated.id, updated);
        changed.push(updated);
      }
      // Other action kinds are emitted by future evaluators; they
      // are applied via dedicated methods (moveMessage, mergeSpaces)
      // so the facade does not apply them here automatically.
    }
    return changed;
  }

  // ─── Read accessors ───────────────────────────────────────────────

  /**
   * All topic spaces currently known, optionally filtered by status.
   */
  spaces(filter?: { status?: TopicStatus | TopicStatus[] }): TopicSpace[] {
    const all = [...this.spacesById.values()];
    if (!filter?.status) return all;
    const statuses = Array.isArray(filter.status) ? filter.status : [filter.status];
    return all.filter((s) => statuses.includes(s.status));
  }

  /**
   * Look up a single space by id. Returns `undefined` if not found.
   */
  space(id: Id): TopicSpace | undefined {
    return this.spacesById.get(id);
  }

  /**
   * The current inbox snapshot.
   */
  inbox(): InboxSpace {
    return this.inboxState;
  }

  // ─── Persistence support ──────────────────────────────────────────

  /**
   * Snapshot the facade's in-memory state for persistence. Host apps
   * typically serialise this with JSON (dates will round-trip as
   * ISO strings; re-hydrate them when constructing a new instance).
   */
  snapshot(): {
    spaces: TopicSpace[];
    inbox: InboxSpace;
    corrections: RoutingCorrection[];
  } {
    return {
      spaces: [...this.spacesById.values()],
      inbox: this.inboxState,
      corrections: this.learner.export(),
    };
  }

  // ─── Internals ────────────────────────────────────────────────────

  private normaliseMessage(input: ClinicInput): Message {
    return {
      id: input.id ?? this.idGenerator(),
      role: input.role,
      content: input.content,
      timestamp: input.timestamp ?? this.clock(),
      ...('routing' in input && input.routing !== undefined ? { routing: input.routing } : {}),
    };
  }

  private appendToSpace(spaceId: Id, message: Message): TopicSpace {
    const current = this.spacesById.get(spaceId);
    if (!current) {
      throw new Error(`appendToSpace: unknown space ${spaceId}`);
    }
    const updated: TopicSpace = {
      ...current,
      messages: [...current.messages, message],
      lastActivityDate: message.timestamp,
      // Revive the space if it had gone dormant.
      status: current.status === 'dormant' ? 'active' : current.status,
    };
    this.spacesById.set(spaceId, updated);
    return updated;
  }

  private createSpace(name: string, seedMessage: Message): TopicSpace {
    const newSpace: TopicSpace = {
      id: this.idGenerator(),
      name,
      keywords: extractKeywords(seedMessage.content),
      createdDate: seedMessage.timestamp,
      lastActivityDate: seedMessage.timestamp,
      creationSource: 'direct',
      status: 'active',
      messages: [seedMessage],
    };
    this.spacesById.set(newSpace.id, newSpace);
    return newSpace;
  }

  private pushToInbox(message: Message): Fragment {
    const fragment: Fragment = {
      id: this.idGenerator(),
      messages: [message],
      timestamp: message.timestamp,
      keywords: extractKeywords(message.content),
    };
    this.inboxState = addFragment(this.inboxState, fragment);
    return fragment;
  }

  private locateMessage(
    messageId: Id,
  ): { kind: 'space'; spaceId: Id } | { kind: 'inbox'; fragmentId: Id } | undefined {
    for (const [spaceId, space] of this.spacesById) {
      if (space.messages.some((m) => m.id === messageId)) {
        return { kind: 'space', spaceId };
      }
    }
    for (const fragment of this.inboxState.fragments) {
      if (fragment.messages.some((m) => m.id === messageId)) {
        return { kind: 'inbox', fragmentId: fragment.id };
      }
    }
    return undefined;
  }
}

let idSequence = 0;

function defaultIdGenerator(): Id {
  idSequence++;
  return `clinic-${Date.now().toString(36)}-${idSequence}`;
}
