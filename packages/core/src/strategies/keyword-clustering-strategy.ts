import {
  defaultRoutingConfiguration,
  type RoutingConfiguration,
} from '../config/routing-configuration.js';
import type { Fragment } from '../types/fragment.js';
import type { FragmentCluster } from '../types/fragment-cluster.js';
import type { Id } from '../types/primitives.js';
import type { ClusteringStrategy } from './interfaces.js';

/**
 * Two clusters with this much fragment overlap (or more) get merged
 * into a single cluster. The threshold is intentionally high so that
 * incidental co-occurrence does not collapse unrelated topics.
 */
const CLUSTER_MERGE_OVERLAP = 0.5;

/**
 * The MVP clustering strategy: group fragments by shared keywords.
 *
 * Algorithm, in plain words:
 * 1. Build an inverted index from keyword → fragments that mention it.
 * 2. For every keyword that appears in ≥2 fragments, emit a candidate
 *    cluster containing those fragments.
 * 3. Greedily merge any two candidate clusters that share more than
 *    {@link CLUSTER_MERGE_OVERLAP} of their fragments. Repeat until
 *    stable.
 * 4. For each surviving cluster, compute:
 *    - The list of keywords that appear in ≥2 of its fragments,
 *      ordered by frequency (the *theme keywords*).
 *    - A coherence score in `[0, 1]` measuring how concentrated the
 *      shared vocabulary is.
 *    - A suggested name: the top theme keyword, or the most frequent
 *      single keyword if no theme emerges.
 *
 * Like {@link KeywordMatchingStrategy}, this is the zero-dependency
 * baseline that ships in core. Embedding-based clustering lives in
 * adapter packages.
 */
export class KeywordClusteringStrategy implements ClusteringStrategy {
  private readonly configuration: RoutingConfiguration;

  constructor(configuration: RoutingConfiguration = defaultRoutingConfiguration) {
    this.configuration = configuration;
  }

  evaluateClusters(fragments: readonly Fragment[]): FragmentCluster[] {
    if (fragments.length === 0) return [];

    // Step 1: inverted index keyword → fragments
    const keywordToFragments = new Map<string, Fragment[]>();
    for (const fragment of fragments) {
      for (const keyword of fragment.keywords) {
        let bucket = keywordToFragments.get(keyword);
        if (!bucket) {
          bucket = [];
          keywordToFragments.set(keyword, bucket);
        }
        bucket.push(fragment);
      }
    }

    // Step 2: keywords shared by ≥2 fragments, ordered by frequency
    // (then alphabetically for deterministic output).
    const commonKeywords = [...keywordToFragments.entries()]
      .filter(([, frags]) => frags.length >= 2)
      .sort((a, b) => {
        if (a[1].length !== b[1].length) return b[1].length - a[1].length;
        return a[0].localeCompare(b[0]);
      });

    if (commonKeywords.length === 0) return [];

    // Step 3: candidate clusters, one per common keyword, dedup-ed by
    // fragment id.
    const candidates: { ids: Set<Id>; fragments: Fragment[] }[] = commonKeywords.map(
      ([, frags]) => {
        const dedup = dedupeById(frags);
        return { ids: new Set(dedup.map((f) => f.id)), fragments: dedup };
      },
    );

    // Step 4: greedy merge until stable.
    const merged = mergeOverlapping(candidates);

    // Step 5: build FragmentCluster objects.
    return merged
      .map((group) => buildCluster(group.fragments))
      .filter((c): c is FragmentCluster => c !== undefined);
  }

  meetsPackagingThreshold(cluster: FragmentCluster): boolean {
    return cluster.fragments.length >= this.configuration.packagingDensityThreshold;
  }
}

function dedupeById(fragments: readonly Fragment[]): Fragment[] {
  const seen = new Set<Id>();
  const result: Fragment[] = [];
  for (const fragment of fragments) {
    if (!seen.has(fragment.id)) {
      seen.add(fragment.id);
      result.push(fragment);
    }
  }
  return result;
}

function mergeOverlapping(
  candidates: { ids: Set<Id>; fragments: Fragment[] }[],
): { ids: Set<Id>; fragments: Fragment[] }[] {
  const consumed = new Array(candidates.length).fill(false);
  const merged: { ids: Set<Id>; fragments: Fragment[] }[] = [];

  for (let i = 0; i < candidates.length; i++) {
    if (consumed[i]) continue;
    const current = {
      ids: new Set<Id>(candidates[i]!.ids),
      fragments: [...candidates[i]!.fragments],
    };
    consumed[i] = true;

    let changed = true;
    while (changed) {
      changed = false;
      for (let j = 0; j < candidates.length; j++) {
        if (consumed[j]) continue;
        const other = candidates[j]!;
        let intersectionSize = 0;
        for (const id of other.ids) {
          if (current.ids.has(id)) intersectionSize++;
        }
        const smallerSize = Math.min(current.ids.size, other.ids.size);
        if (smallerSize === 0) continue;
        const overlap = intersectionSize / smallerSize;
        if (overlap > CLUSTER_MERGE_OVERLAP) {
          for (const id of other.ids) current.ids.add(id);
          current.fragments = dedupeById([...current.fragments, ...other.fragments]);
          consumed[j] = true;
          changed = true;
        }
      }
    }

    merged.push(current);
  }
  return merged;
}

function buildCluster(fragments: readonly Fragment[]): FragmentCluster | undefined {
  if (fragments.length === 0) return undefined;

  const frequency = new Map<string, number>();
  const uniqueKeywords = new Set<string>();
  for (const fragment of fragments) {
    for (const keyword of fragment.keywords) {
      frequency.set(keyword, (frequency.get(keyword) ?? 0) + 1);
      uniqueKeywords.add(keyword);
    }
  }

  const shared = new Map<string, number>();
  for (const [keyword, count] of frequency) {
    if (count >= 2) shared.set(keyword, count);
  }

  // Coherence: how many "shared" keyword occurrences there are per
  // fragment, normalised by total vocabulary diversity. Ranges in
  // [0, 1]. High means every fragment keeps hitting the same small set
  // of words; low means broad vocabulary with thin overlap.
  const totalSharedOccurrences = fragments.reduce((sum, fragment) => {
    return sum + fragment.keywords.filter((k) => shared.has(k)).length;
  }, 0);
  const avgSharedPerFragment =
    fragments.length === 0 ? 0 : totalSharedOccurrences / fragments.length;
  const coherenceRaw = uniqueKeywords.size === 0 ? 0 : avgSharedPerFragment / uniqueKeywords.size;
  const coherenceScore = Math.min(1, Math.max(0, coherenceRaw));

  const themeKeywords = [...shared.entries()]
    .sort((a, b) => {
      if (a[1] !== b[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })
    .map(([k]) => k);

  const suggestedName =
    themeKeywords[0] ??
    [...frequency.entries()].sort((a, b) => {
      if (a[1] !== b[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    })[0]?.[0] ??
    'Untitled';

  const orderedFragments = [...fragments].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
  );

  return {
    fragments: orderedFragments,
    themeKeywords,
    coherenceScore,
    suggestedName,
  };
}
