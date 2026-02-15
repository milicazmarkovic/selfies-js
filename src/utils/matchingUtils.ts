/**
 * Graph matching utilities for kekulization
 * Ported from Python SELFIES library v2.2.0
 */

interface PQueueItem {
    priority: number;
    node: number;
}

/**
 * Finds a perfect matching for an undirected graph (without self-loops).
 * 
 * @param graph - An adjacency list representing the input graph
 * @returns A list representing a perfect matching, where j is the i-th
 *          element if nodes i and j are matched. Returns null if the graph cannot
 *          be perfectly matched.
 */
export function findPerfectMatching(graph: number[][]): number[] | null {
    // Start with a maximal matching for efficiency
    const matching = greedyMatching(graph);

    const unmatched = new Set<number>();
    for (let i = 0; i < matching.length; i++) {
        if (matching[i] === null) {
            unmatched.add(i);
        }
    }

    while (unmatched.size > 0) {
        // Find augmenting path which starts at root
        const rootIter = unmatched.values().next();
        if (rootIter.done) break;
        const root: number = rootIter.value;
        unmatched.delete(root);

        const path = findAugmentingPath(graph, root, matching);

        if (path === null) {
            return null;
        } else {
            flipAugmentingPath(matching, path);
            unmatched.delete(path[0]);
            unmatched.delete(path[path.length - 1]);
        }
    }

    return matching as number[];
}

/**
 * Greedy matching algorithm for initial matching
 */
function greedyMatching(graph: number[][]): (number | null)[] {
    const matching: (number | null)[] = new Array(graph.length).fill(null);
    const freeDegrees = graph.map(neighbors => neighbors.length);
    // freeDegrees[i] = number of unmatched neighbors for node i

    // Prioritize nodes with fewer unmatched neighbors (min-heap)
    const nodePQueue: PQueueItem[] = [];
    for (let i = 0; i < graph.length; i++) {
        nodePQueue.push({ priority: freeDegrees[i], node: i });
    }
    heapify(nodePQueue);

    while (nodePQueue.length > 0) {
        const { node } = heapPop(nodePQueue);

        if (matching[node] !== null || freeDegrees[node] === 0) {
            continue; // node cannot be matched
        }

        // Match node with first unmatched neighbor
        const mate = graph[node].find(i => matching[i] === null);
        if (mate === undefined) continue;

        matching[node] = mate;
        matching[mate] = node;

        // Update free degrees
        const adjacents = [...graph[node], ...graph[mate]];
        for (const adj of adjacents) {
            freeDegrees[adj]--;
            if (matching[adj] === null && freeDegrees[adj] > 0) {
                heapPush(nodePQueue, { priority: freeDegrees[adj], node: adj });
            }
        }
    }

    return matching;
}

/**
 * Finds an augmenting path from root to an unmatched node
 */
function findAugmentingPath(
    graph: number[][],
    root: number,
    matching: (number | null)[]
): number[] | null {
    // Run modified BFS to find path from root to unmatched node
    let otherEnd: number | null = null;
    const nodeQueue: number[] = [root];

    // Parent BFS tree - null indicates an unvisited node
    const parents: [number, number][] | null[] = new Array(graph.length).fill(null);
    parents[root] = [null!, null!];

    while (nodeQueue.length > 0) {
        const node = nodeQueue.shift()!;

        for (const adj of graph[node]) {
            if (matching[adj] === null) {
                // Unmatched node
                if (adj !== root) {
                    // Augmenting path found!
                    parents[adj] = [node, adj];
                    otherEnd = adj;
                    break;
                }
            } else {
                const adjMate = matching[adj];
                if (parents[adjMate!] === null) {
                    // adj_mate not visited
                    parents[adjMate!] = [node, adj];
                    nodeQueue.push(adjMate!);
                }
            }
        }

        if (otherEnd !== null) {
            break; // Augmenting path found!
        }
    }

    if (otherEnd === null) {
        return null;
    } else {
        const path: number[] = [];
        let node: number | null = otherEnd;
        while (node !== root) {
            const parent = parents[node] as [number, number];
            path.push(parent[1]);
            path.push(parent[0]);
            node = parent[0];
        }
        return path;
    }
}

/**
 * Flips edges along an augmenting path
 */
function flipAugmentingPath(matching: (number | null)[], path: number[]): void {
    for (let i = 0; i < path.length; i += 2) {
        const a = path[i];
        const b = path[i + 1];
        matching[a] = b;
        matching[b] = a;
    }
}

// =============================================================================
// Min-heap implementation for priority queue
// =============================================================================

function heapify(heap: PQueueItem[]): void {
    for (let i = Math.floor(heap.length / 2) - 1; i >= 0; i--) {
        siftDown(heap, i);
    }
}

function heapPush(heap: PQueueItem[], item: PQueueItem): void {
    heap.push(item);
    siftUp(heap, heap.length - 1);
}

function heapPop(heap: PQueueItem[]): PQueueItem {
    const result = heap[0];
    const last = heap.pop()!;
    if (heap.length > 0) {
        heap[0] = last;
        siftDown(heap, 0);
    }
    return result;
}

function siftUp(heap: PQueueItem[], pos: number): void {
    const item = heap[pos];
    while (pos > 0) {
        const parentPos = Math.floor((pos - 1) / 2);
        const parent = heap[parentPos];
        if (item.priority >= parent.priority) break;
        heap[pos] = parent;
        pos = parentPos;
    }
    heap[pos] = item;
}

function siftDown(heap: PQueueItem[], pos: number): void {
    const item = heap[pos];
    const endPos = heap.length;
    let childPos = 2 * pos + 1;

    while (childPos < endPos) {
        const rightPos = childPos + 1;
        if (rightPos < endPos && heap[childPos].priority >= heap[rightPos].priority) {
            childPos = rightPos;
        }
        heap[pos] = heap[childPos];
        pos = childPos;
        childPos = 2 * pos + 1;
    }

    heap[pos] = item;
    siftUp(heap, pos);
}
