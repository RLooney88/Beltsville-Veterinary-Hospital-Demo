import React, { useEffect, useMemo, useState } from "react";
import { adminApi } from "../../lib/api";
import { CalendarClock, Phone, Mail, PawPrint } from "lucide-react";

const STATUSES = ["new", "confirmed", "cancelled"];
const STATUS_CLASS = {
  new: "bg-clinic-amber/20 text-clinic-amber",
  confirmed: "bg-clinic-sage text-clinic-forest",
  cancelled: "bg-sand-200 text-clinic-mist",
};

function formatDate(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AdminChatBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.get("/admin/chat-bookings");
      setBookings(data);
    } catch (e) {
      console.warn("failed to load bookings", e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => (filter === "all" ? bookings : bookings.filter((b) => b.status === filter)),
    [bookings, filter]
  );

  const updateStatus = async (id, status) => {
    await adminApi.patch(`/admin/chat-bookings/${id}`, { status });
    await load();
  };

  return (
    <div data-testid="admin-chat-bookings">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">
            Chatbot
          </div>
          <h1 className="font-display text-3xl font-extrabold text-clinic-navy mt-2">
            Chat Bookings
          </h1>
          <p className="text-clinic-mist text-sm mt-1">
            Appointments booked directly through the chat widget. Follow up to confirm the time and add them to your schedule.
          </p>
        </div>
        <div className="flex gap-1 bg-white border border-sand-300/60 rounded-full p-1">
          {["all", ...STATUSES].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 text-xs rounded-full font-semibold capitalize ${
                filter === s ? "bg-clinic-navy text-white" : "text-clinic-mist hover:text-clinic-navy"
              }`}
              data-testid={`chat-bookings-filter-${s}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="text-sm text-clinic-mist">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-sand-300/60 rounded-2xl p-12 text-center" data-testid="chat-bookings-empty">
            <CalendarClock className="h-8 w-8 text-clinic-mist/60 mx-auto" />
            <div className="font-display font-bold text-clinic-navy mt-3">No bookings yet</div>
            <p className="text-sm text-clinic-mist mt-1.5 max-w-sm mx-auto">
              Once a visitor books through the chat widget, the details will show up here for your team to follow up on.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-sand-300/60 p-6"
                data-testid={`chat-booking-${b.id}`}
              >
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="font-display font-bold text-clinic-navy text-base">
                        {b.client_name}
                      </div>
                      <span className={`text-[10px] uppercase tracking-[0.18em] font-bold px-2 py-0.5 rounded-full ${STATUS_CLASS[b.status] || ""}`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="mt-1.5 text-xs text-clinic-mist">
                      {formatDate(b.created_at)}
                    </div>

                    <div className="mt-4 grid gap-2 text-sm">
                      <div className="flex items-center gap-2 text-clinic-navy">
                        <Phone className="h-3.5 w-3.5 text-clinic-mist shrink-0" />
                        <a href={`tel:${b.client_phone}`} className="hover:text-clinic-red">{b.client_phone}</a>
                      </div>
                      <div className="flex items-center gap-2 text-clinic-navy">
                        <Mail className="h-3.5 w-3.5 text-clinic-mist shrink-0" />
                        <a href={`mailto:${b.client_email}`} className="hover:text-clinic-red truncate">{b.client_email}</a>
                      </div>
                      <div className="flex items-center gap-2 text-clinic-navy">
                        <PawPrint className="h-3.5 w-3.5 text-clinic-mist shrink-0" />
                        <span>
                          <span className="font-semibold">{b.pet_name}</span>{" "}
                          <span className="text-clinic-mist">· {b.pet_breed}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-clinic-navy">
                        <CalendarClock className="h-3.5 w-3.5 text-clinic-mist shrink-0" />
                        <span>{b.preferred_time}</span>
                      </div>
                      {b.notes && (
                        <div className="mt-1 text-xs text-clinic-mist bg-sand-100 rounded-lg px-3 py-2">
                          {b.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {b.status !== "confirmed" && (
                      <button
                        onClick={() => updateStatus(b.id, "confirmed")}
                        className="text-xs font-semibold bg-clinic-forest text-white rounded-full px-4 py-1.5 hover:bg-clinic-navy transition-colors"
                        data-testid={`chat-booking-confirm-${b.id}`}
                      >
                        Mark confirmed
                      </button>
                    )}
                    {b.status !== "cancelled" && (
                      <button
                        onClick={() => updateStatus(b.id, "cancelled")}
                        className="text-xs font-semibold text-clinic-mist hover:text-clinic-red rounded-full px-4 py-1.5 transition-colors"
                        data-testid={`chat-booking-cancel-${b.id}`}
                      >
                        Cancel
                      </button>
                    )}
                    {b.status === "cancelled" && (
                      <button
                        onClick={() => updateStatus(b.id, "new")}
                        className="text-xs font-semibold text-clinic-mist hover:text-clinic-navy rounded-full px-4 py-1.5 transition-colors"
                      >
                        Reopen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
