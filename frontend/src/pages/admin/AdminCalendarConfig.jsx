import React, { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Plus, Trash2, Clock, Users, CalendarX, Palette } from "lucide-react";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function minsToHHMM(m) {
  const h = Math.floor(m / 60).toString().padStart(2, "0");
  const mm = (m % 60).toString().padStart(2, "0");
  return `${h}:${mm}`;
}
function HHMMtoMins(s) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

export default function AdminCalendarConfig() {
  const [config, setConfig] = useState(null);

  const load = async () => {
    const { data } = await adminApi.get("/booking/admin/config");
    setConfig(data);
  };
  useEffect(() => { load(); }, []);

  if (!config) return <div className="text-sm text-clinic-mist">Loading…</div>;

  return (
    <div data-testid="admin-calendar-config">
      <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">Calendar</div>
      <h1 className="font-display text-3xl font-extrabold text-clinic-navy mt-2">Booking configuration</h1>
      <p className="text-clinic-mist text-sm mt-1">
        Set clinic hours, staff capacity, appointment types, and blackout dates. Changes apply to all future bookings immediately.
      </p>

      <Tabs defaultValue="hours" className="mt-8">
        <TabsList className="bg-sand-100 flex-wrap h-auto">
          <TabsTrigger value="hours"><Clock className="h-3.5 w-3.5 mr-1.5" />Hours</TabsTrigger>
          <TabsTrigger value="staff"><Users className="h-3.5 w-3.5 mr-1.5" />Staffing</TabsTrigger>
          <TabsTrigger value="types"><Palette className="h-3.5 w-3.5 mr-1.5" />Appointment Types</TabsTrigger>
          <TabsTrigger value="blocks"><CalendarX className="h-3.5 w-3.5 mr-1.5" />Blackout</TabsTrigger>
        </TabsList>

        <TabsContent value="hours" className="mt-6">
          <HoursEditor hours={config.hours} onSaved={load} />
        </TabsContent>
        <TabsContent value="staff" className="mt-6">
          <StaffEditor staff={config.staff} onSaved={load} />
        </TabsContent>
        <TabsContent value="types" className="mt-6">
          <TypesEditor types={config.types} onSaved={load} />
        </TabsContent>
        <TabsContent value="blocks" className="mt-6">
          <BlocksEditor blocks={config.blocked_times} onSaved={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HoursEditor({ hours, onSaved }) {
  const [rows, setRows] = useState(hours.map((h) => ({
    ...h,
    open_str: minsToHHMM(h.open_minutes),
    close_str: minsToHHMM(h.close_minutes),
  })));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const payload = rows.map((r) => ({
        day_of_week: r.day_of_week,
        is_open: r.is_open,
        open_minutes: HHMMtoMins(r.open_str),
        close_minutes: HHMMtoMins(r.close_str),
      }));
      await adminApi.put("/booking/admin/config/hours", payload);
      toast.success("Hours saved.");
      onSaved();
    } catch (e) {
      toast.error("Failed to save hours.");
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-sand-300/60 p-6">
      <div className="grid gap-3">
        {rows.map((r, i) => (
          <div key={r.day_of_week} className="flex items-center gap-4" data-testid={`hours-row-${r.day_of_week}`}>
            <div className="w-28 font-semibold text-clinic-navy">{DAYS[r.day_of_week]}</div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={r.is_open} onChange={(e) => {
                const n = [...rows]; n[i] = { ...n[i], is_open: e.target.checked }; setRows(n);
              }} />
              Open
            </label>
            <input
              type="time"
              disabled={!r.is_open}
              value={r.open_str}
              onChange={(e) => { const n = [...rows]; n[i] = { ...n[i], open_str: e.target.value }; setRows(n); }}
              className="rounded-lg border border-sand-300 px-3 py-2 text-sm disabled:opacity-40"
            />
            <span className="text-clinic-mist">to</span>
            <input
              type="time"
              disabled={!r.is_open}
              value={r.close_str}
              onChange={(e) => { const n = [...rows]; n[i] = { ...n[i], close_str: e.target.value }; setRows(n); }}
              className="rounded-lg border border-sand-300 px-3 py-2 text-sm disabled:opacity-40"
            />
          </div>
        ))}
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="mt-6 bg-clinic-navy text-white rounded-full px-6 py-2 text-sm font-semibold disabled:opacity-50"
        data-testid="hours-save"
      >
        {saving ? "Saving…" : "Save hours"}
      </button>
    </div>
  );
}

function StaffEditor({ staff, onSaved }) {
  const [form, setForm] = useState(staff);
  const [saving, setSaving] = useState(false);
  const up = (k) => (e) => setForm({ ...form, [k]: Number(e.target.value) });
  const save = async () => {
    setSaving(true);
    try {
      await adminApi.patch("/booking/admin/config/staff", form);
      toast.success("Staffing saved.");
      onSaved();
    } catch {
      toast.error("Failed to save staffing.");
    }
    setSaving(false);
  };
  return (
    <div className="bg-white rounded-2xl border border-sand-300/60 p-6 grid gap-5 max-w-2xl">
      <Row label="Number of doctors" hint="How many appointments can overlap that require the doctor.">
        <input type="number" min={0} max={20} value={form.num_doctors} onChange={up("num_doctors")} className={inputCls} data-testid="staff-num-doctors" />
      </Row>
      <Row label="Number of vet techs" hint="Tech-only and tech-portion bookings count against this.">
        <input type="number" min={0} max={20} value={form.num_techs} onChange={up("num_techs")} className={inputCls} data-testid="staff-num-techs" />
      </Row>
      <Row label="Slot granularity (minutes)" hint="Visitors see start times every N minutes. 30 is typical.">
        <input type="number" min={5} max={120} step={5} value={form.slot_granularity_mins} onChange={up("slot_granularity_mins")} className={inputCls} />
      </Row>
      <Row label="Booking window (days)" hint="How far in advance visitors can book.">
        <input type="number" min={1} max={90} value={form.booking_window_days} onChange={up("booking_window_days")} className={inputCls} />
      </Row>
      <Row label="Minimum lead time (hours)" hint="Earliest a visitor can book from now.">
        <input type="number" min={0} max={168} value={form.min_lead_time_hours} onChange={up("min_lead_time_hours")} className={inputCls} />
      </Row>
      <button onClick={save} disabled={saving} className="self-start bg-clinic-navy text-white rounded-full px-6 py-2 text-sm font-semibold disabled:opacity-50" data-testid="staff-save">
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

const EMPTY_TYPE = { name: "", description: "", duration_mins: 30, doctor_mins: 30, tech_mins: 30, color: "#8bc0a8", sort_order: 100, active: true };

function TypesEditor({ types, onSaved }) {
  const [editing, setEditing] = useState(null);

  const save = async (payload) => {
    try {
      if (payload.id) {
        const { id, ...body } = payload;
        await adminApi.patch(`/booking/admin/config/types/${id}`, body);
      } else {
        await adminApi.post("/booking/admin/config/types", payload);
      }
      toast.success("Saved.");
      setEditing(null);
      onSaved();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save type.");
    }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this type? Bookings already made are kept.")) return;
    try {
      await adminApi.delete(`/booking/admin/config/types/${id}`);
      toast.success("Deleted.");
      onSaved();
    } catch {
      toast.error("Failed.");
    }
  };

  return (
    <div className="grid gap-3">
      {types.map((t) => (
        <div key={t.id} className="bg-white rounded-2xl border border-sand-300/60 p-5 flex items-start justify-between gap-4" data-testid={`type-row-${t.id}`}>
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-full" style={{ background: t.color || "#ccc" }} />
            <div className="min-w-0">
              <div className="font-display font-bold text-clinic-navy flex items-center gap-2">
                {t.name}
                {!t.active && <span className="text-[10px] uppercase tracking-wider bg-sand-200 text-clinic-mist px-2 py-0.5 rounded">Off</span>}
              </div>
              <div className="text-xs text-clinic-mist mt-0.5">
                {t.duration_mins} min total · doctor {t.doctor_mins}min · tech {t.tech_mins}min
              </div>
              {t.description && <div className="text-xs text-clinic-mist mt-1">{t.description}</div>}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => setEditing(t)} className="text-xs font-semibold text-clinic-navy hover:text-clinic-red">Edit</button>
            <button onClick={() => remove(t.id)} className="text-xs text-clinic-mist hover:text-clinic-red" data-testid={`type-delete-${t.id}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={() => setEditing({ ...EMPTY_TYPE })}
        className="inline-flex items-center gap-2 self-start text-sm font-semibold text-clinic-forest hover:text-clinic-navy"
        data-testid="type-add"
      >
        <Plus className="h-4 w-4" /> Add appointment type
      </button>

      {editing && (
        <TypeForm value={editing} onCancel={() => setEditing(null)} onSave={save} />
      )}
    </div>
  );
}

function TypeForm({ value, onCancel, onSave }) {
  const [form, setForm] = useState(value);
  const up = (k, type = "text") => (e) => {
    const v = type === "number" ? Number(e.target.value) : type === "checkbox" ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: v });
  };
  return (
    <div className="bg-sand-100 rounded-2xl p-6 grid gap-4" data-testid="type-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <Row label="Name"><input value={form.name} onChange={up("name")} className={inputCls} data-testid="type-name" /></Row>
        <Row label="Color"><input type="color" value={form.color || "#8bc0a8"} onChange={up("color")} className="h-10 w-20 rounded border border-sand-300" /></Row>
        <Row label="Duration (min)"><input type="number" min={5} value={form.duration_mins} onChange={up("duration_mins", "number")} className={inputCls} /></Row>
        <Row label="Doctor time (min)" hint="Minutes the doctor is engaged. Limits doctor concurrency."><input type="number" min={0} value={form.doctor_mins} onChange={up("doctor_mins", "number")} className={inputCls} /></Row>
        <Row label="Tech time (min)" hint="Minutes a tech is engaged. Usually = duration."><input type="number" min={0} value={form.tech_mins} onChange={up("tech_mins", "number")} className={inputCls} /></Row>
        <Row label="Sort order"><input type="number" value={form.sort_order} onChange={up("sort_order", "number")} className={inputCls} /></Row>
      </div>
      <Row label="Description"><textarea rows={2} value={form.description || ""} onChange={up("description")} className={inputCls} /></Row>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={form.active} onChange={up("active", "checkbox")} />
        Active (visible to visitors)
      </label>
      <div className="flex gap-2">
        <button onClick={() => onSave(form)} className="bg-clinic-navy text-white rounded-full px-5 py-2 text-sm font-semibold" data-testid="type-save">Save</button>
        <button onClick={onCancel} className="text-clinic-mist hover:text-clinic-navy text-sm font-semibold px-4">Cancel</button>
      </div>
    </div>
  );
}

function BlocksEditor({ blocks, onSaved }) {
  const [form, setForm] = useState({ reason: "", starts_at: "", ends_at: "", blocks: "all" });
  const add = async () => {
    if (!form.starts_at || !form.ends_at) return toast.error("Pick both start and end times.");
    try {
      const payload = {
        reason: form.reason,
        starts_at: new Date(form.starts_at).toISOString(),
        ends_at: new Date(form.ends_at).toISOString(),
        blocks: form.blocks,
      };
      await adminApi.post("/booking/admin/config/blocks", payload);
      toast.success("Block added.");
      setForm({ reason: "", starts_at: "", ends_at: "", blocks: "all" });
      onSaved();
    } catch {
      toast.error("Failed.");
    }
  };
  const remove = async (id) => {
    if (!window.confirm("Remove this blackout?")) return;
    await adminApi.delete(`/booking/admin/config/blocks/${id}`);
    toast.success("Removed.");
    onSaved();
  };
  return (
    <div className="grid gap-4">
      <div className="bg-white rounded-2xl border border-sand-300/60 p-5 grid gap-3 sm:grid-cols-5" data-testid="block-add-form">
        <input placeholder="Reason (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={inputCls + " sm:col-span-2"} />
        <input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className={inputCls} />
        <input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className={inputCls} />
        <select value={form.blocks} onChange={(e) => setForm({ ...form, blocks: e.target.value })} className={inputCls}>
          <option value="all">All staff</option>
          <option value="doctor">Doctor only</option>
          <option value="tech">Tech only</option>
        </select>
        <button onClick={add} className="sm:col-span-5 justify-self-start inline-flex items-center gap-2 text-sm font-semibold text-clinic-forest hover:text-clinic-navy" data-testid="block-add-btn">
          <Plus className="h-4 w-4" /> Add blackout
        </button>
      </div>

      {blocks.length === 0 ? (
        <div className="text-sm text-clinic-mist">No blackouts configured.</div>
      ) : blocks.map((b) => (
        <div key={b.id} className="bg-white rounded-2xl border border-sand-300/60 p-4 flex items-center justify-between gap-4" data-testid={`block-row-${b.id}`}>
          <div className="min-w-0">
            <div className="font-semibold text-clinic-navy">{b.reason || "Blackout"}</div>
            <div className="text-xs text-clinic-mist mt-0.5">
              {new Date(b.starts_at).toLocaleString()} → {new Date(b.ends_at).toLocaleString()} · blocks: {b.blocks}
            </div>
          </div>
          <button onClick={() => remove(b.id)} className="text-clinic-mist hover:text-clinic-red" data-testid={`block-delete-${b.id}`}><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-white border border-sand-300 px-3 py-2 text-sm text-clinic-navy outline-none focus:border-clinic-forest";

function Row({ label, hint, children }) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-xs font-semibold text-clinic-navy uppercase tracking-wider">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-clinic-mist">{hint}</span>}
    </label>
  );
}
