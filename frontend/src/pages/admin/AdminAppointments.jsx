import React, { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../lib/api";
import { CalendarClock, Phone, Mail, PawPrint, User } from "lucide-react";

const STATUS_CLASS = {
  booked: "bg-clinic-amber/20 text-clinic-amber",
  confirmed: "bg-clinic-sage text-clinic-forest",
  cancelled: "bg-sand-200 text-clinic-mist line-through",
  completed: "bg-clinic-navy/20 text-clinic-navy",
};

function fmtDateTime(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function AdminAppointments() {
  const [appts, setAppts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get("/booking/admin/appointments");
      setAppts(data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const now = Date.now();
    if (filter === "upcoming") return appts.filter((a) => new Date(a.starts_at).getTime() >= now && a.status !== "cancelled");
    if (filter === "past") return appts.filter((a) => new Date(a.ends_at).getTime() < now);
    if (filter === "cancelled") return appts.filter((a) => a.status === "cancelled");
    return appts;
  }, [appts, filter]);

  const update = async (id, status) => {
    await adminApi.patch(`/booking/admin/appointments/${id}`, { status });
    load();
  };

  return (
    <div data-testid="admin-appointments">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">Calendar</div>
          <h1 className="font-display text-3xl font-extrabold text-clinic-navy mt-2">Appointments</h1>
          <p className="text-clinic-mist text-sm mt-1">Every slot booked through the website.</p>
        </div>
        <div className="flex gap-1 bg-white border border-sand-300/60 rounded-full p-1">
          {["upcoming", "past", "cancelled", "all"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 text-xs rounded-full font-semibold capitalize ${
                filter === s ? "bg-clinic-navy text-white" : "text-clinic-mist hover:text-clinic-navy"
              }`}
              data-testid={`appt-filter-${s}`}
            >{s}</button>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-4">
        {loading ? (
          <div className="text-sm text-clinic-mist">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-sand-300/60 rounded-2xl p-12 text-center text-sm text-clinic-mist" data-testid="appt-empty">
            No appointments to show.
          </div>
        ) : filtered.map((a) => (
          <div key={a.id} className="bg-white rounded-2xl border border-sand-300/60 p-6 flex items-start justify-between gap-5 flex-wrap" data-testid={`appt-${a.id}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-display font-bold text-clinic-navy">{fmtDateTime(a.starts_at)}</div>
                <span className={`text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full ${STATUS_CLASS[a.status] || ""}`}>
                  {a.status}
                </span>
                {a.appointment_type_name && (
                  <span className="text-xs font-semibold text-clinic-forest bg-clinic-sage/40 rounded-full px-3 py-0.5">
                    {a.appointment_type_name}
                  </span>
                )}
              </div>
              <div className="mt-3 grid gap-1.5 sm:grid-cols-2 text-sm">
                <div className="flex items-center gap-2 text-clinic-navy"><User className="h-3.5 w-3.5 text-clinic-mist" />{a.client_name}</div>
                <div className="flex items-center gap-2 text-clinic-navy"><PawPrint className="h-3.5 w-3.5 text-clinic-mist" />{a.pet_name || "—"} {a.pet_type && <span className="text-clinic-mist">· {a.pet_type}</span>}</div>
                <a href={`tel:${a.client_phone}`} className="flex items-center gap-2 text-clinic-navy hover:text-clinic-red"><Phone className="h-3.5 w-3.5 text-clinic-mist" />{a.client_phone || "—"}</a>
                <a href={`mailto:${a.client_email}`} className="flex items-center gap-2 text-clinic-navy hover:text-clinic-red"><Mail className="h-3.5 w-3.5 text-clinic-mist" />{a.client_email}</a>
              </div>
              {a.notes && <div className="mt-3 text-xs text-clinic-mist bg-sand-100 rounded-lg px-3 py-2">{a.notes}</div>}
            </div>
            <div className="flex flex-col gap-2 shrink-0 items-end">
              {a.status === "booked" && (
                <button onClick={() => update(a.id, "confirmed")} className="text-xs font-semibold bg-clinic-forest text-white rounded-full px-4 py-1.5 hover:bg-clinic-navy" data-testid={`appt-confirm-${a.id}`}>Confirm</button>
              )}
              {a.status !== "cancelled" && a.status !== "completed" && (
                <button onClick={() => update(a.id, "cancelled")} className="text-xs font-semibold text-clinic-mist hover:text-clinic-red rounded-full px-4 py-1.5" data-testid={`appt-cancel-${a.id}`}>Cancel</button>
              )}
              {a.status === "confirmed" && (
                <button onClick={() => update(a.id, "completed")} className="text-xs font-semibold text-clinic-mist hover:text-clinic-navy rounded-full px-4 py-1.5">Mark done</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
