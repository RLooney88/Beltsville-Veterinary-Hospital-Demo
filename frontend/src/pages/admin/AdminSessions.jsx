import React, { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";

export default function AdminSessions() {
  const [sessions, setSessions] = useState([]);
  const [open, setOpen] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    adminApi.get("/admin/sessions").then((r) => setSessions(r.data));
  }, []);

  const openSession = async (s) => {
    setOpen(s);
    const { data } = await adminApi.get(`/admin/sessions/${s.id}/events`);
    setEvents(data);
  };

  return (
    <div data-testid="admin-sessions">
      <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">Visitor Sessions</div>
      <h1 className="font-display text-3xl font-extrabold text-clinic-navy mt-2">Sessions &amp; signals</h1>
      <p className="text-clinic-mist text-sm mt-1">
        Each row is a distinct visitor. Click to see their full signal timeline.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-2xl border border-sand-300/60 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-sand-100 text-xs uppercase tracking-widest text-clinic-mist">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Intent</th>
                <th className="text-left px-5 py-3 font-semibold">Views</th>
                <th className="text-left px-5 py-3 font-semibold">Signals</th>
                <th className="text-left px-5 py-3 font-semibold">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr
                  key={s.id}
                  className={`border-t border-sand-300/50 cursor-pointer hover:bg-sand-100/60 ${open?.id === s.id ? "bg-clinic-sage/40" : ""}`}
                  onClick={() => openSession(s)}
                  data-testid={`session-row-${s.id}`}
                >
                  <td className="px-5 py-3">
                    <div className="font-semibold text-clinic-navy">
                      {s.parent_intent || "unknown"}
                    </div>
                    <div className="text-xs text-clinic-mist">{s.sub_intent || "-"}</div>
                  </td>
                  <td className="px-5 py-3 text-clinic-mist">{s.page_view_count}</td>
                  <td className="px-5 py-3 text-clinic-mist">{s.event_count}</td>
                  <td className="px-5 py-3 text-clinic-mist text-xs">
                    {new Date(s.last_seen_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-clinic-mist">No sessions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-sand-300/60 p-5 min-h-[320px]" data-testid="session-timeline">
          {!open ? (
            <div className="text-sm text-clinic-mist">Select a session to see its full signal trail.</div>
          ) : (
            <div>
              <div className="text-xs uppercase tracking-widest font-bold text-clinic-forest">Timeline</div>
              <div className="font-display font-bold text-clinic-navy mt-1">{open.parent_intent || "unknown"} · {open.sub_intent || "-"}</div>
              <div className="mt-2 text-xs text-clinic-mist">
                Scores: parent {JSON.stringify(open.intent_scores || {})} · sub {JSON.stringify(open.sub_intent_scores || {})}
              </div>
              <ol className="mt-4 space-y-2">
                {events.map((e) => (
                  <li key={e.id} className="flex items-start gap-3 text-xs border-l-2 border-clinic-forest/30 pl-3">
                    <span className="font-semibold text-clinic-navy w-24 shrink-0">{e.signal_type}</span>
                    <span className="flex-1 text-clinic-mist">{e.label || e.page_path || e.intent || "-"}</span>
                    <span className="text-clinic-mist/70">{new Date(e.created_at).toLocaleTimeString()}</span>
                  </li>
                ))}
                {events.length === 0 && <li className="text-xs text-clinic-mist">No events logged.</li>}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
