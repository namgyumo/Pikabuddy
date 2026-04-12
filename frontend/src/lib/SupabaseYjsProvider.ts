/**
 * SupabaseYjsProvider — Syncs a Y.Doc via Supabase Realtime broadcast.
 * Handles document updates AND awareness (cursor positions).
 */
import * as Y from "yjs";
import { Awareness, encodeAwarenessUpdate, applyAwarenessUpdate, removeAwarenessStates } from "y-protocols/awareness";
import type { RealtimeChannel } from "@supabase/supabase-js";

export class SupabaseYjsProvider {
  doc: Y.Doc;
  awareness: Awareness;
  private channel: RealtimeChannel | null = null;
  private _synced = false;
  private _destroyed = false;

  constructor(doc: Y.Doc) {
    this.doc = doc;
    this.awareness = new Awareness(doc);
    this.doc.on("update", this._onDocUpdate);
    this.awareness.on("update", this._onAwarenessUpdate);
  }

  get synced() { return this._synced; }

  /** Connect to a Supabase Realtime channel and start syncing. */
  connect(channel: RealtimeChannel) {
    if (this._destroyed) return;
    this.channel = channel;

    // Remote doc updates
    channel.on("broadcast", { event: "yjs-update" }, ({ payload }) => {
      if (payload.cid === this.doc.clientID) return;
      try {
        Y.applyUpdate(this.doc, new Uint8Array(payload.d), "remote");
      } catch { /* ignore malformed */ }
    });

    // Remote awareness updates
    channel.on("broadcast", { event: "yjs-aw" }, ({ payload }) => {
      if (payload.cid === this.doc.clientID) return;
      try {
        applyAwarenessUpdate(this.awareness, new Uint8Array(payload.d), "remote");
      } catch { /* ignore */ }
    });

    // Sync protocol: peer requests full state
    channel.on("broadcast", { event: "yjs-req" }, ({ payload }) => {
      if (payload.cid === this.doc.clientID) return;
      this._sendFullState();
    });

    // Sync protocol: receive full state response
    channel.on("broadcast", { event: "yjs-res" }, ({ payload }) => {
      if (payload.cid === this.doc.clientID) return;
      try {
        Y.applyUpdate(this.doc, new Uint8Array(payload.d), "remote");
      } catch { /* ignore */ }
      this._synced = true;
    });

    // After subscribe, request state from peers
    setTimeout(() => {
      if (this.channel) {
        this.channel.send({
          type: "broadcast", event: "yjs-req",
          payload: { cid: this.doc.clientID },
        });
      }
    }, 200);

    // If no peers respond within 2s, mark as synced (we are the first)
    setTimeout(() => { if (!this._synced) this._synced = true; }, 2000);
  }

  disconnect() {
    if (this.channel) {
      removeAwarenessStates(this.awareness, [this.doc.clientID], "disconnect");
      this.channel = null;
    }
    this._synced = false;
  }

  destroy() {
    this._destroyed = true;
    this.disconnect();
    this.doc.off("update", this._onDocUpdate);
    this.awareness.off("update", this._onAwarenessUpdate);
    this.awareness.destroy();
  }

  private _sendFullState() {
    if (!this.channel) return;
    const state = Y.encodeStateAsUpdate(this.doc);
    this.channel.send({
      type: "broadcast", event: "yjs-res",
      payload: { cid: this.doc.clientID, d: Array.from(state) },
    });
    // Also send our awareness
    const aw = encodeAwarenessUpdate(this.awareness, [this.doc.clientID]);
    this.channel.send({
      type: "broadcast", event: "yjs-aw",
      payload: { cid: this.doc.clientID, d: Array.from(aw) },
    });
  }

  private _onDocUpdate = (update: Uint8Array, origin: any) => {
    if (origin === "remote" || !this.channel) return;
    this.channel.send({
      type: "broadcast", event: "yjs-update",
      payload: { cid: this.doc.clientID, d: Array.from(update) },
    });
  };

  private _onAwarenessUpdate = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
    if (!this.channel) return;
    const changed = [...added, ...updated, ...removed];
    const aw = encodeAwarenessUpdate(this.awareness, changed);
    this.channel.send({
      type: "broadcast", event: "yjs-aw",
      payload: { cid: this.doc.clientID, d: Array.from(aw) },
    });
  };
}

/** Deterministic color from user ID for cursor display */
const COLLAB_COLORS = [
  "#f44336", "#e91e63", "#9c27b0", "#673ab7",
  "#3f51b5", "#2196f3", "#00bcd4", "#009688",
  "#4caf50", "#ff9800", "#ff5722", "#795548",
];
export function getCollabColor(userId?: string | null): string {
  if (!userId) return COLLAB_COLORS[0];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}
