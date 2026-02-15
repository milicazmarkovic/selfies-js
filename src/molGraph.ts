/**
 * Molecular graph representation - atoms, bonds, and molecular structures
 * Ported from Python SELFIES library v2.2.0
 */

import { getBondingCapacity } from './bondConstraints';
import { AROMATIC_VALENCES, VALENCE_ELECTRONS } from './constants';
import { findPerfectMatching } from './utils/matchingUtils';

export interface Attribution {
    /** Token index */
    index: number;
    /** Token string */
    token: string;
}

export interface AttributionMap {
    /** Index of output token */
    index: number;
    /** Output token */
    token: string;
    /** List of input tokens that created the output token */
    attribution: Attribution[];
}

export class Atom {
    index: number | null = null;
    element: string;
    isAromatic: boolean;
    isotope: number | null;
    chirality: string | null;
    hCount: number | null;
    charge: number;
    
    private _bondingCapacity: number | null = null;

    constructor(
        element: string,
        isAromatic: boolean,
        isotope: number | null = null,
        chirality: string | null = null,
        hCount: number | null = null,
        charge: number = 0
    ) {
        this.element = element;
        this.isAromatic = isAromatic;
        this.isotope = isotope;
        this.chirality = chirality;
        this.hCount = hCount;
        this.charge = charge;
    }

    get bondingCapacity(): number {
        if (this._bondingCapacity === null) {
            let bondCap = getBondingCapacity(this.element, this.charge);
            bondCap -= this.hCount === null ? 0 : this.hCount;
            this._bondingCapacity = bondCap;
        }
        return this._bondingCapacity;
    }

    invertChirality(): void {
        if (this.chirality === "@") {
            this.chirality = "@@";
        } else if (this.chirality === "@@") {
            this.chirality = "@";
        }
    }
}

export class DirectedBond {
    src: number;
    dst: number;
    order: number;
    stereo: string | null;
    ringBond: boolean;

    constructor(
        src: number,
        dst: number,
        order: number,
        stereo: string | null,
        ringBond: boolean
    ) {
        this.src = src;
        this.dst = dst;
        this.order = order;
        this.stereo = stereo;
        this.ringBond = ringBond;
    }
}

export class MolecularGraph {
    private _roots: number[] = [];
    private _atoms: Atom[] = [];
    private _bondDict: Map<string, DirectedBond> = new Map();
    private _adjList: DirectedBond[][] = [];
    private _bondCounts: number[] = [];
    private _ringBondFlags: boolean[] = [];
    private _delocalSubgraph: Map<number, number[]> = new Map();
    private _attribution: Map<any, Attribution[]> = new Map();
    private _attributable: boolean;

    constructor(attributable: boolean = false) {
        this._attributable = attributable;
    }

    get length(): number {
        return this._atoms.length;
    }

    hasBond(a: number, b: number): boolean {
        if (a > b) [a, b] = [b, a];
        return this._bondDict.has(`${a},${b}`);
    }

    hasOutRingBond(src: number): boolean {
        return this._ringBondFlags[src];
    }

    getAttribution(o: DirectedBond | Atom): Attribution[] | null {
        if (this._attributable && this._attribution.has(o)) {
            return this._attribution.get(o)!;
        }
        return null;
    }

    getRoots(): number[] {
        return [...this._roots];
    }

    getAtom(idx: number): Atom {
        return this._atoms[idx];
    }

    getAtoms(): Atom[] {
        return [...this._atoms];
    }

    getDirBond(src: number, dst: number): DirectedBond {
        const bond = this._bondDict.get(`${src},${dst}`);
        if (!bond) {
            throw new Error(`Bond not found: ${src},${dst}`);
        }
        return bond;
    }

    getOutDirBonds(src: number): DirectedBond[] {
        return [...this._adjList[src]];
    }

    getBondCount(idx: number): number {
        return this._bondCounts[idx];
    }

    addAtom(atom: Atom, markRoot: boolean = false): Atom {
        atom.index = this.length;

        if (markRoot) {
            this._roots.push(atom.index);
        }

        this._atoms.push(atom);
        this._adjList.push([]);
        this._bondCounts.push(0);
        this._ringBondFlags.push(false);

        if (atom.isAromatic) {
            this._delocalSubgraph.set(atom.index, []);
        }

        return atom;
    }

    addAttribution(o: DirectedBond | Atom, attr: Attribution[]): void {
        if (this._attributable) {
            if (this._attribution.has(o)) {
                this._attribution.get(o)!.push(...attr);
            } else {
                this._attribution.set(o, [...attr]);
            }
        }
    }

    addBond(
        src: number,
        dst: number,
        order: number,
        stereo: string | null
    ): DirectedBond {
        if (src >= dst) {
            throw new Error("src must be less than dst");
        }

        const bond = new DirectedBond(src, dst, order, stereo, false);
        this._addBondAtLoc(bond, -1);
        this._bondCounts[src] += order;
        this._bondCounts[dst] += order;

        if (order === 1.5) {
            if (!this._delocalSubgraph.has(src)) {
                this._delocalSubgraph.set(src, []);
            }
            this._delocalSubgraph.get(src)!.push(dst);

            if (!this._delocalSubgraph.has(dst)) {
                this._delocalSubgraph.set(dst, []);
            }
            this._delocalSubgraph.get(dst)!.push(src);
        }

        return bond;
    }

    addPlaceholderBond(src: number): number {
        const outEdges = this._adjList[src];
        outEdges.push(null as any);
        return outEdges.length - 1;
    }

    addRingBond(
        a: number,
        b: number,
        order: number,
        aStereo: string | null,
        bStereo: string | null,
        aPos: number = -1,
        bPos: number = -1
    ): void {
        const aBond = new DirectedBond(a, b, order, aStereo, true);
        const bBond = new DirectedBond(b, a, order, bStereo, true);

        this._addBondAtLoc(aBond, aPos);
        this._addBondAtLoc(bBond, bPos);

        this._bondCounts[a] += order;
        this._bondCounts[b] += order;
        this._ringBondFlags[a] = true;
        this._ringBondFlags[b] = true;

        if (order === 1.5) {
            if (!this._delocalSubgraph.has(a)) {
                this._delocalSubgraph.set(a, []);
            }
            this._delocalSubgraph.get(a)!.push(b);

            if (!this._delocalSubgraph.has(b)) {
                this._delocalSubgraph.set(b, []);
            }
            this._delocalSubgraph.get(b)!.push(a);
        }
    }

    private _addBondAtLoc(bond: DirectedBond, pos: number): void {
        const src = bond.src;
        const dst = bond.dst;
        const key = `${src},${dst}`;  // Use actual src,dst not sorted!

        this._bondDict.set(key, bond);

        const outEdges = this._adjList[src];
        if (pos === -1 || pos === outEdges.length) {
            outEdges.push(bond);
        } else if (outEdges[pos] === null) {
            outEdges[pos] = bond;
        } else {
            outEdges.splice(pos, 0, bond);  // INSERT at position, not overwrite
        }
    }

    /**
     * Check if the molecule has been kekulized (no aromatic bonds remaining)
     */
    isKekulized(): boolean {
        return this._delocalSubgraph.size === 0;
    }

    /**
     * Update the bond order between two atoms
     * @param a - First atom index
     * @param b - Second atom index
     * @param newOrder - New bond order (1, 1.5, 2, or 3)
     */
    updateBondOrder(a: number, b: number, newOrder: number): void {
        if (newOrder < 1 || newOrder > 3) {
            throw new Error('Bond order must be between 1 and 3');
        }

        // Ensure a < b for consistent lookup
        if (a > b) {
            [a, b] = [b, a];
        }

        const key = `${a},${b}`;
        const aToB = this._bondDict.get(key);
        if (!aToB) {
            throw new Error(`Bond not found: ${key}`);
        }

        if (newOrder === aToB.order) {
            return;
        }

        const bonds: DirectedBond[] = [aToB];
        if (aToB.ringBond) {
            const bToA = this._bondDict.get(`${b},${a}`);
            if (bToA) bonds.push(bToA);
        }

        const oldOrder = bonds[0].order;
        for (const bond of bonds) {
            bond.order = newOrder;
        }

        this._bondCounts[a] += (newOrder - oldOrder);
        this._bondCounts[b] += (newOrder - oldOrder);
    }

    /**
     * Kekulize the molecule - convert aromatic bonds to explicit single/double bonds
     * Algorithm based on: https://depth-first.com/articles/2020/02/10/
     * a-comprehensive-treatment-of-aromaticity-in-the-smiles-language/
     */
    kekulize(): boolean {
        if (this.isKekulized()) {
            return true;
        }

        const ds = this._delocalSubgraph;
        
        // Filter out nodes that should be pruned
        const keptNodes = new Set<number>();
        for (const node of ds.keys()) {
            if (!this._pruneFromDs(node)) {
                keptNodes.add(node);
            }
        }

        // Relabel kept DS nodes to be 0, 1, 2, ...
        const labelToNode = Array.from(keptNodes).sort((a, b) => a - b);
        const nodeToLabel = new Map<number, number>();
        labelToNode.forEach((node, idx) => {
            nodeToLabel.set(node, idx);
        });

        // Build pruned and relabelled delocalized subgraph
        const prunedDs: number[][] = Array.from({ length: keptNodes.size }, () => []);
        for (const node of keptNodes) {
            const label = nodeToLabel.get(node)!;
            const adjNodes = ds.get(node) || [];
            for (const adj of adjNodes) {
                if (keptNodes.has(adj)) {
                    prunedDs[label].push(nodeToLabel.get(adj)!);
                }
            }
        }

        // Find perfect matching
        const matching = findPerfectMatching(prunedDs);
        if (matching === null) {
            return false;
        }

        // De-aromatize and make single bonds
        for (const node of ds.keys()) {
            const adjNodes = ds.get(node) || [];
            for (const adj of adjNodes) {
                this.updateBondOrder(node, adj, 1);
            }
            this._atoms[node].isAromatic = false;
            this._bondCounts[node] = Math.floor(this._bondCounts[node]);
        }

        // Apply double bonds from matching
        for (let i = 0; i < matching.length; i++) {
            const matchedLabel = matching[i];
            if (matchedLabel !== null && i < matchedLabel) {
                // Only process each pair once
                const nodeA = labelToNode[i];
                const nodeB = labelToNode[matchedLabel];
                this.updateBondOrder(nodeA, nodeB, 2);
            }
        }

        this._delocalSubgraph.clear();
        return true;
    }

    /**
     * Determines if a node should be pruned from the delocalized subgraph
     * Based on aromaticity rules and valence calculations
     */
    private _pruneFromDs(node: number): boolean {
        const adjNodes = this._delocalSubgraph.get(node) || [];
        if (adjNodes.length === 0) {
            return true; // aromatic atom with no aromatic bonds
        }

        const atom = this._atoms[node];
        const valences = AROMATIC_VALENCES[atom.element];
        if (!valences) {
            return true; // element not in aromatic subset
        }

        // Each bond in DS has order 1.5 - we treat them as single bonds
        const usedElectronsBase = Math.floor(this._bondCounts[node] - 0.5 * adjNodes.length);

        if (atom.hCount === null) {
            // Account for implicit Hs
            // Assuming charge is 0 for aromatic atoms with implicit H
            return valences.some(v => usedElectronsBase === v);
        } else {
            const valence = valences[valences.length - 1] - atom.charge;
            const usedElectrons = usedElectronsBase + atom.hCount;

            // Count the total number of bound electrons
            const bondCounts = this._bondCounts[node];
            const boundElectrons = Math.max(0, atom.charge) + atom.hCount +
                Math.floor(bondCounts) +
                Math.floor(2 * (bondCounts % 1));

            // Calculate the number of unpaired electrons
            const valenceElectrons = VALENCE_ELECTRONS[atom.element];
            if (valenceElectrons === undefined) {
                return true;
            }

            const radicalElectrons = Math.max(0, valenceElectrons - boundElectrons) % 2;

            // Unpaired electrons do not contribute to the aromatic system
            const freeElectrons = valence - usedElectrons - radicalElectrons;

            if (valences.some(v => usedElectrons === v - atom.charge)) {
                return true;
            } else {
                return !((freeElectrons >= 0) && (freeElectrons % 2 !== 0));
            }
        }
    }
}
