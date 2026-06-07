import React, { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../lib/api";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import {
  Activity,
  Mail,
  Phone,
  PawPrint,
  CalendarClock,
  FileText,
  MessageCircle,
  MousePointerClick,
  Eye,
  Send,
} from "lucide-react";

const STATUSES = ["new", "contacted", "closed"];

export default function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data } = await adminApi.get("/admin/leads");
    setLeads(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => (filter === "all" ? leads : leads.filter((l) => l.status === filter)),
    [leads, filter]
  );

  const updateStatus = async (lead, status) => {
    await adminApi.patch(`/admin/leads/${lead.id}`, { status });
    await load();
    if (open && open.id === lead.id) setOpen({ ...open, status });
  };

  return (
    <div data-testid="admin-leads">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">Inbox</div>
          <h1 className="font-display text-3xl font-extrabold text-clinic-navy mt-2">Leads</h1>
          <p className="text-clinic-mist text-sm mt-1">Each submission includes the visitor&rsquo;s browsing-intent summary.</p>
        </div>
        <div className="flex gap-1 bg-white border border-sand-300/60 rounded-full p-1">
          {["all", ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 text-xs rounded-full font-semibold capitalize ${
                filter === s ? "bg-clinic-navy text-white" : "text-clinic-mist hover:text-clinic-navy"
              }`}
              data-testid={`leads-filter-${s}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8 bg-white rounded-2xl border border-sand-300/60 overflow-hidden">
        <table className="w-full text-sm" data-testid="leads-table">
          <thead className="bg-sand-100 text-xs uppercase tracking-widest text-clinic-mist">
            <tr>
              <th className="text-left px-5 py-3 font-semibold">Name</th>
              <th className="text-left px-5 py-3 font-semibold">Contact</th>
              <th className="text-left px-5 py-3 font-semibold">Pet / Service</th>
              <th className="text-left px-5 py-3 font-semibold">Inferred intent</th>
              <th className="text-left px-5 py-3 font-semibold">Status</th>
              <th className="text-left px-5 py-3 font-semibold">When</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-clinic-mist">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-5 py-10 text-center text-clinic-mist">No leads yet.</td></tr>
            ) : (
              filtered.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => setOpen(l)}
                  className="border-t border-sand-300/50 cursor-pointer hover:bg-sand-100/60"
                  data-testid={`lead-row-${l.id}`}
                >
                  <td className="px-5 py-4 font-semibold text-clinic-navy">{l.name}</td>
                  <td className="px-5 py-4 text-clinic-mist">
                    <div>{l.email}</div>
                    {l.phone && <div className="text-xs">{l.phone}</div>}
                  </td>
                  <td className="px-5 py-4 text-clinic-mist">
                    <div className="text-clinic-navy font-semibold">{l.pet_name || "-"} <span className="font-normal text-clinic-mist">({l.pet_type || "?"})</span></div>
                    <div className="text-xs">{l.service_interest || "-"}</div>
                  </td>
                  <td className="px-5 py-4">
                    {l.intent_summary?.parent_intent ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-clinic-sage px-3 py-1 text-[11px] font-bold text-clinic-forest uppercase tracking-widest">
                        {l.intent_summary.parent_intent}
                        {l.intent_summary.sub_intent && <> · {l.intent_summary.sub_intent}</>}
                      </span>
                    ) : (
                      <span className="text-clinic-mist text-xs">unknown</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={l.status} />
                  </td>
                  <td className="px-5 py-4 text-clinic-mist text-xs whitespace-nowrap">
                    {new Date(l.created_at).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          {open && (
            <div data-testid="lead-detail-panel">
              <SheetHeader>
                <SheetTitle className="font-display text-2xl text-clinic-navy">{open.name}</SheetTitle>
              </SheetHeader>
              <div className="mt-2 flex flex-wrap gap-3 text-sm">
                <a href={`mailto:${open.email}`} className="inline-flex items-center gap-1.5 text-clinic-forest font-semibold hover:underline">
                  <Mail className="h-3.5 w-3.5" /> {open.email}
                </a>
                {open.phone && (
                  <a href={`tel:${open.phone}`} className="inline-flex items-center gap-1.5 text-clinic-forest font-semibold hover:underline">
                    <Phone className="h-3.5 w-3.5" /> {open.phone}
                  </a>
                )}
                <span className="inline-flex items-center gap-1.5 text-clinic-mist text-xs">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {new Date(open.created_at).toLocaleString()}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {open.intent_summary?.parent_intent && (
                  <Badge tone="sage">
                    {labelFor("intent", open.intent_summary.parent_intent)}
                  </Badge>
                )}
                {open.intent_summary?.sub_intent && (
                  <Badge tone="peach">
                    {labelFor("sub", open.intent_summary.sub_intent)}
                  </Badge>
                )}
                <StatusBadge status={open.status} />
              </div>

              <div className="mt-6 flex gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(open, s)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize ${
                      open.status === s ? "bg-clinic-navy text-white" : "bg-sand-100 text-clinic-navy hover:bg-sand-200"
                    }`}
                    data-testid={`lead-status-${s}`}
                  >
                    Mark {s}
                  </button>
                ))}
              </div>

              <Tabs defaultValue="summary" className="mt-8">
                <TabsList className="bg-sand-100">
                  <TabsTrigger value="summary" data-testid="lead-tab-summary">
                    <FileText className="h-3.5 w-3.5 mr-1.5" /> Summary
                  </TabsTrigger>
                  <TabsTrigger value="activity" data-testid="lead-tab-activity">
                    <Activity className="h-3.5 w-3.5 mr-1.5" /> Activity
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="mt-5">
                  {/* Narrative from LLM */}
                  <section className="bg-clinic-sage/40 rounded-2xl p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] font-bold text-clinic-forest">
                      Visit narrative
                    </div>
                    {open.narrative_summary ? (
                      <p className="mt-2 text-sm text-clinic-navy leading-relaxed whitespace-pre-wrap" data-testid="lead-narrative">
                        {open.narrative_summary}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-clinic-mist italic">
                        Narrative being generated… Refresh in a moment.
                      </p>
                    )}
                  </section>

                  {/* Form-submitted data, human-readable */}
                  <section className="mt-5 bg-white rounded-2xl border border-sand-300/60 p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] font-bold text-clinic-forest">
                      What they told us
                    </div>
                    <div className="mt-3 grid gap-3 text-sm">
                      <Kv k="Pet" v={`${open.pet_name || "Not given"} (${labelFor("intent", open.pet_type) || "Not specified"})`} />
                      <Kv k="Reason for visit" v={open.service_interest || "Not specified"} />
                      <Kv k="Preferred time" v={open.preferred_time || "Flexible"} />
                      <Kv k="Landed from" v={open.source_page || "-"} />
                      <Kv k="Their note" v={open.comment || "(none)"} multiline />
                    </div>
                  </section>

                  {/* Top interests, extracted from signal scores */}
                  <section className="mt-5 bg-white rounded-2xl border border-sand-300/60 p-5">
                    <div className="text-[11px] uppercase tracking-[0.22em] font-bold text-clinic-forest">
                      Strongest interests
                    </div>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {topScores(open.intent_summary?.intent_scores).map((row) => (
                        <li key={"i-" + row.key} className="flex items-center justify-between">
                          <span className="text-clinic-navy">{labelFor("intent", row.key)}</span>
                          <span className="text-xs text-clinic-mist">{row.value} signal{row.value === 1 ? "" : "s"}</span>
                        </li>
                      ))}
                      {topScores(open.intent_summary?.sub_intent_scores).map((row) => (
                        <li key={"s-" + row.key} className="flex items-center justify-between">
                          <span className="text-clinic-navy">{labelFor("sub", row.key)}</span>
                          <span className="text-xs text-clinic-mist">{row.value} signal{row.value === 1 ? "" : "s"}</span>
                        </li>
                      ))}
                      {topScores(open.intent_summary?.intent_scores).length === 0 &&
                        topScores(open.intent_summary?.sub_intent_scores).length === 0 && (
                          <li className="text-xs text-clinic-mist">
                            No intent signals captured. Visitor arrived and submitted quickly.
                          </li>
                        )}
                    </ul>
                    <div className="mt-4 text-xs text-clinic-mist">
                      Visited {open.intent_summary?.page_views ?? 0} page{(open.intent_summary?.page_views ?? 0) === 1 ? "" : "s"} before submitting.
                      {open.intent_summary?.first_referrer && (
                        <> First referrer: <span className="text-clinic-navy">{open.intent_summary.first_referrer}</span>.</>
                      )}
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="activity" className="mt-5">
                  <section className="bg-white rounded-2xl border border-sand-300/60 p-4">
                    <div className="text-[11px] uppercase tracking-[0.22em] font-bold text-clinic-forest mb-3 px-2">
                      Full visit timeline
                    </div>
                    <ActivityTimeline trail={open.signal_trail || []} />
                  </section>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// --- Helpers ---------------------------------------------------------------

const INTENT_LABELS = { dogs: "Dogs", cats: "Cats", critters: "Small & Exotic Pets" };
const SUB_INTENT_LABELS = {
  new_puppy: "New puppy",
  new_kitten: "New kitten",
  wellness: "Wellness",
  health_concerns: "Illness & injury",
  senior: "Senior care",
  treatments: "Specific treatments",
  husbandry: "Habitat & diet",
};

function labelFor(kind, key) {
  if (!key) return "";
  if (kind === "intent") return INTENT_LABELS[key] || key;
  if (kind === "sub") return SUB_INTENT_LABELS[key] || key;
  return key;
}

function topScores(scores) {
  if (!scores || typeof scores !== "object") return [];
  return Object.entries(scores)
    .filter(([, v]) => typeof v === "number" && v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, value]) => ({ key, value }));
}

function Badge({ tone = "sage", children }) {
  const cls = tone === "peach"
    ? "bg-clinic-peach text-clinic-navy"
    : "bg-clinic-sage text-clinic-forest";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${cls}`}>
      <PawPrint className="h-3 w-3" /> {children}
    </span>
  );
}

function ActivityTimeline({ trail }) {
  if (!trail || trail.length === 0) {
    return <div className="text-xs text-clinic-mist px-2 py-6 text-center">No signals captured.</div>;
  }
  return (
    <ol className="relative pl-6">
      <span className="absolute left-3 top-1 bottom-1 w-px bg-sand-300" />
      {trail.map((e, i) => {
        const { icon, tint, label, detail } = describeEvent(e);
        return (
          <li key={i} className="relative py-2">
            <span className={`absolute -left-0.5 top-2.5 h-5 w-5 rounded-full grid place-items-center ${tint}`}>
              {icon}
            </span>
            <div className="ml-6">
              <div className="text-sm text-clinic-navy font-semibold">{label}</div>
              {detail && <div className="text-xs text-clinic-mist mt-0.5">{detail}</div>}
              {e.created_at && (
                <div className="text-[10px] text-clinic-mist mt-0.5">
                  {new Date(e.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function describeEvent(e) {
  const type = e.signal_type || "event";
  const label = e.label || "";
  const page = e.page_path || "";
  const intent = labelFor("intent", e.intent);
  const sub = labelFor("sub", e.sub_intent);
  const tag = [intent, sub].filter(Boolean).join(" · ");

  if (type === "page_view") {
    return {
      icon: <Eye className="h-3 w-3 text-white" />,
      tint: "bg-clinic-forest",
      label: `Viewed ${page || "a page"}`,
      detail: tag || label || null,
    };
  }
  if (type === "cta_click" || type === "service_click" || type === "nav_click") {
    return {
      icon: <MousePointerClick className="h-3 w-3 text-white" />,
      tint: "bg-clinic-navy",
      label: `Clicked ${label || "something"}`,
      detail: [page, tag].filter(Boolean).join(" · ") || null,
    };
  }
  if (type === "chat_intent" || type === "chat_message") {
    return {
      icon: <MessageCircle className="h-3 w-3 text-white" />,
      tint: "bg-clinic-red",
      label: "Chatted with the assistant",
      detail: label || null,
    };
  }
  if (type === "form_start") {
    return {
      icon: <FileText className="h-3 w-3 text-white" />,
      tint: "bg-clinic-amber",
      label: "Opened the appointment form",
      detail: tag || null,
    };
  }
  if (type === "form_submit") {
    return {
      icon: <Send className="h-3 w-3 text-white" />,
      tint: "bg-clinic-red",
      label: "Submitted the form",
      detail: label || tag || null,
    };
  }
  return {
    icon: <Activity className="h-3 w-3 text-white" />,
    tint: "bg-clinic-mist",
    label: type.replace(/_/g, " "),
    detail: label || page || tag || null,
  };
}

function StatusBadge({ status }) {
  const tone = status === "new"
    ? "bg-clinic-amber/20 text-clinic-navy"
    : status === "contacted"
    ? "bg-clinic-sage text-clinic-forest"
    : "bg-sand-200 text-clinic-mist";
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest ${tone}`}>
      {status}
    </span>
  );
}

function Kv({ k, v, multiline = false }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
      <div className="text-xs uppercase tracking-widest font-bold text-clinic-forest">{k}</div>
      <div className={`text-clinic-navy ${multiline ? "whitespace-pre-wrap" : ""}`}>{v}</div>
    </div>
  );
}
