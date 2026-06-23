// Durable Object « guichet joueur » : un exemplaire par uid (idFromName(uid)),
// mono-thread ⇒ toutes les mutations d'état (énergie, actions, missions) sont
// sérialisées, donc atomiques. Remplace l'accès direct au KV depuis index.ts.
//
// Storage : la base SQLite du DO (fortement cohérente), clé `player`, au format
// JSON IDENTIQUE à l'ancien doc KV (le `parse()` de state.ts est inchangé). KV
// n'est plus qu'une SOURCE d'hydratation : au premier accès d'un joueur, si le
// storage du DO est vide, on l'amorce depuis `player:{uid}` en KV ; ensuite le
// DO fait foi (ne plus lire KV comme vérité).

import { DurableObject } from 'cloudflare:workers';
import type {
  PlayerState,
  HistoryEntry,
  AdminPlayerPatch,
} from '@sges/api-contract';
import {
  getState,
  getHistory,
  spendEnergy,
  startAction,
  adminUpdate,
  adminReset,
  key,
  rosterKey,
  type Store,
  type SpendResult,
  type ActionResult,
} from './state';
import type { Env } from './index';

const STORAGE_KEY = 'player'; // doc joueur (JSON sérialisé, format KV)
const UID_KEY = 'uid'; // marqueur « DO déjà hydraté » + uid mémorisé

export class PlayerDO extends DurableObject<Env> {
  // Adapte le storage du DO à l'interface Store attendue par state.ts.
  private readonly store: Store = {
    get: async () => (await this.ctx.storage.get<string>(STORAGE_KEY)) ?? null,
    put: (value: string) => this.ctx.storage.put(STORAGE_KEY, value),
  };

  // Amorce le storage depuis KV au premier accès (idempotent : le marqueur
  // UID_KEY garantit qu'on ne réimporte jamais par-dessus des données du DO).
  private async hydrate(uid: string): Promise<void> {
    if (await this.ctx.storage.get<string>(UID_KEY)) return;
    const fromKv = await this.env.ENERGY_KV.get(key(uid));
    if (fromKv) await this.ctx.storage.put(STORAGE_KEY, fromKv);
    await this.ctx.storage.put(UID_KEY, uid);
    // Inscrit le joueur à l'annuaire (permet de tous les lister côté back-office).
    await this.env.ENERGY_KV.put(rosterKey(uid), '1');
  }

  async getState(uid: string): Promise<PlayerState> {
    await this.hydrate(uid);
    return getState(this.store, this.env);
  }

  async getHistory(uid: string): Promise<HistoryEntry[]> {
    await this.hydrate(uid);
    return getHistory(this.store, this.env);
  }

  async spendEnergy(uid: string, amount: number): Promise<SpendResult> {
    await this.hydrate(uid);
    return spendEnergy(this.store, this.env, amount);
  }

  async startAction(
    uid: string,
    actionId: string,
    subMissionId?: string
  ): Promise<ActionResult> {
    await this.hydrate(uid);
    return startAction(this.store, this.env, actionId, subMissionId);
  }

  // --- Back-office : édition d'un joueur (autorisation vérifiée dans index.ts) -
  async adminUpdate(
    uid: string,
    patch: AdminPlayerPatch
  ): Promise<PlayerState> {
    await this.hydrate(uid);
    return adminUpdate(this.store, this.env, patch);
  }

  async adminReset(uid: string): Promise<PlayerState> {
    await this.hydrate(uid);
    return adminReset(this.store, this.env);
  }
}
