/* eslint-disable react-hooks/exhaustive-deps */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";

const STORAGE_KEY = "avw_session_token";
const SESSION_SNAPSHOT_KEY = "avw_session_snapshot";

const SmartSiteContext = createContext(null);

export function useSmartSite() {
  const ctx = useContext(SmartSiteContext);
  if (!ctx) throw new Error("useSmartSite must be used within SmartSiteProvider");
  return ctx;
}

const INTENT_LABELS = {
  dogs: "Dogs",
  cats: "Cats",
  critters: "Small & Exotic Pets",
};

const SUB_INTENT_LABELS = {
  new_puppy: "New Puppy",
  new_kitten: "New Kitten",
  wellness: "Wellness & Preventive",
  health_concerns: "Health Concerns",
  senior: "Senior Care",
  treatments: "Specific Treatments",
  husbandry: "Habitat / Husbandry",
};

export function SmartSiteProvider({ children }) {
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const [session, setSession] = useState(() => {
    // Hydrate from snapshot so parent_intent is known before /sessions/init completes.
    // This eliminates the flash of default content on repeat visits.
    try {
      const raw = localStorage.getItem(SESSION_SNAPSHOT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [ready, setReady] = useState(false);
  const [clearNonce, setClearNonce] = useState(0);
  const initRef = useRef(false);
  // Generation counter: bumped on clearIntent. Any in-flight request that was
  // started before a clear captures the old generation and must NOT call
  // setSession when it resolves, otherwise a slow response tied to the old
  // session token (e.g. a chat_intent track) re-hydrates the cleared intent.
  const genRef = useRef(0);

  // Persist session snapshot (parent_intent + sub_intent) whenever it updates.
  useEffect(() => {
    if (!session) return;
    try {
      localStorage.setItem(
        SESSION_SNAPSHOT_KEY,
        JSON.stringify({
          parent_intent: session.parent_intent || null,
          sub_intent: session.sub_intent || null,
          intent_scores: session.intent_scores || {},
          sub_intent_scores: session.sub_intent_scores || {},
        })
      );
    } catch {
      /* quota, ignore */
    }
  }, [session]);

  const init = useCallback(async (opts = {}) => {
    if (initRef.current && !opts.force) return;
    initRef.current = true;
    const myGen = genRef.current;
    try {
      const { data } = await api.post("/sessions/init", {
        // When force is set (e.g. clearIntent), send null so the backend mints
        // a brand-new session token instead of re-hydrating the old intent.
        existing_token: opts.force ? null : sessionToken,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
      });
      if (genRef.current !== myGen) return; // superseded by a clearIntent
      setSessionToken(data.session_token);
      localStorage.setItem(STORAGE_KEY, data.session_token);
      setSession(data);
    } catch (e) {
      console.warn("Smart site session init failed", e);
    } finally {
      setReady(true);
    }
  }, [sessionToken]);

  useEffect(() => {
    init();
  }, []);

  const track = useCallback(
    async ({ signalType, pagePath, label, intent, subIntent, strength = 1, meta = {} }) => {
      if (!sessionToken) return null;
      const myGen = genRef.current;
      try {
        const { data } = await api.post("/signals/track", {
          session_token: sessionToken,
          signal_type: signalType,
          page_path: pagePath ?? window.location.pathname,
          label: label ?? null,
          intent: intent ?? null,
          sub_intent: subIntent ?? null,
          strength,
          meta,
        });
        if (genRef.current !== myGen) return null; // superseded by a clearIntent
        setSession(data);
        return data;
      } catch (e) {
        console.warn("track failed", e);
        return null;
      }
    },
    [sessionToken]
  );

  const setIntent = useCallback(
    (intent, subIntent = null, { label = "intent_select_manual" } = {}) =>
      track({
        signalType: subIntent ? "sub_intent_select" : "intent_select",
        intent,
        subIntent,
        label,
        strength: 2,
      }),
    [track]
  );

  const clearIntent = useCallback(() => {
    // Hard reset: invalidate every in-flight request (so a slow response tied
    // to the old token can't re-hydrate the cleared intent), wipe the session
    // token + snapshot, drop every per-intent surface cache, signal the chat
    // widget to reset its conversation, then force the backend to mint a
    // brand-new neutral session token.
    genRef.current += 1;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_SNAPSHOT_KEY);
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("avw_surface_v3_"))
        .forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    setSessionToken(null);
    setSession(null);
    setClearNonce((n) => n + 1);
    initRef.current = false;
    init({ force: true });
  }, [init]);

  const getSurfaceContent = useCallback(
    async (slug, opts = {}) => {
      const params = {};
      if (sessionToken) params.session_token = sessionToken;
      if (opts.forceIntent) params.force_intent = opts.forceIntent;
      if (opts.forceSubIntent) params.force_sub_intent = opts.forceSubIntent;
      const { data } = await api.get(`/surfaces/${slug}/content`, { params });
      return data;
    },
    [sessionToken]
  );

  // Track page views automatically on route change
  useEffect(() => {
    if (!ready || !sessionToken) return;
    track({ signalType: "page_view", pagePath: window.location.pathname });
  }, [ready, sessionToken]);

  // Expose a global API for external chat widget
  useEffect(() => {
    window.smartSite = {
      getSession: () => session,
      getSessionToken: () => sessionToken,
      setIntent: (intent, subIntent) => setIntent(intent, subIntent, { label: "chat_intent" }),
      trackSignal: (payload) =>
        track({
          signalType: payload.signalType || "chat_intent",
          intent: payload.intent,
          subIntent: payload.subIntent,
          label: payload.label || "chat",
          meta: payload.meta || {},
          strength: payload.strength || 2,
        }),
      clearIntent,
    };
    return () => {
      try {
        delete window.smartSite;
      } catch {
        window.smartSite = undefined;
      }
    };
  }, [session, sessionToken, setIntent, track, clearIntent]);

  const value = useMemo(
    () => ({
      ready,
      sessionToken,
      session,
      clearNonce,
      parentIntent: session?.parent_intent || null,
      subIntent: session?.sub_intent || null,
      intentLabel: session?.parent_intent ? INTENT_LABELS[session.parent_intent] : null,
      subIntentLabel: session?.sub_intent ? SUB_INTENT_LABELS[session.sub_intent] : null,
      track,
      setIntent,
      clearIntent,
      getSurfaceContent,
    }),
    [ready, sessionToken, session, clearNonce, track, setIntent, clearIntent, getSurfaceContent]
  );

  return <SmartSiteContext.Provider value={value}>{children}</SmartSiteContext.Provider>;
}

export { INTENT_LABELS, SUB_INTENT_LABELS };
