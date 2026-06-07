import React, { useState, useEffect } from "react";
import { Quote } from "lucide-react";
import { useSurface } from "../hooks/useSurface";
import { practice } from "../site/siteConfig";

export default function Testimonials() {
  const { content, loading } = useSurface("home_proof");
  const [page, setPage] = useState(0);

  const items = content?.testimonials || [];
  const pageSize = 3;
  const totalPages = Math.ceil(items.length / pageSize);

  useEffect(() => {
    if (totalPages <= 1) return;
    const timer = setInterval(() => {
      setPage((p) => (p + 1) % totalPages);
    }, 6000);
    return () => clearInterval(timer);
  }, [totalPages]);

  // Reset page when content changes (intent switch)
  useEffect(() => { setPage(0); }, [content]);

  if (loading || !content || items.length === 0) return null;

  const visible = items.slice(page * pageSize, page * pageSize + pageSize);

  return (
    <section className="mt-24" data-testid="testimonials">
      <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">Pet-stimonials</div>
      <h2 className="font-display text-3xl sm:text-4xl font-bold text-clinic-navy mt-3 max-w-2xl">
        {content.heading || `Families across ${practice.serviceArea || "the community"} trust us with their pets.`}
      </h2>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {visible.map((t, i) => {
          const absIdx = page * pageSize + i;
          const tint =
            absIdx % 3 === 0
              ? "bg-clinic-red text-sand-50 border-clinic-red/30"
              : absIdx % 3 === 1
              ? "bg-clinic-peach text-clinic-navy border-clinic-peachDeep/70"
              : "bg-clinic-sage text-clinic-navy border-clinic-forest/15";
          const quoteColor = absIdx % 3 === 0 ? "text-white/40" : "text-clinic-forest/30";
          const tagBg = absIdx % 3 === 0 ? "bg-white/15 text-white" : "bg-white/80 text-clinic-forest";
          return (
            <article
              key={`${page}-${i}`}
              className={`relative overflow-hidden rounded-[1.5rem] p-7 border transition-opacity duration-500 animate-[fade-up_0.5s_ease-out_both] ${tint}`}
              style={{ animationDelay: `${i * 100}ms` }}
              data-testid={`testimonial-${absIdx}`}
            >
              <Quote className={`absolute top-5 right-5 h-7 w-7 ${quoteColor}`} />
              <p className={`text-[15px] leading-relaxed font-medium ${absIdx % 3 === 0 ? "text-white" : "text-clinic-navy"}`}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-6 flex items-center justify-between gap-3">
                <div className={`text-sm font-semibold ${absIdx % 3 === 0 ? "text-white" : "text-clinic-navy"}`}>
                  {t.author || "Client"}
                </div>
                {t.tag && (
                  <span className={`text-[11px] uppercase tracking-widest font-bold rounded-full px-3 py-1 ${tagBg}`}>
                    {t.tag}
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2" data-testid="testimonial-dots">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === page ? "w-6 bg-clinic-red" : "w-2 bg-sand-300 hover:bg-sand-400"
              }`}
              aria-label={`Show reviews ${i * pageSize + 1} to ${Math.min((i + 1) * pageSize, items.length)}`}
              data-testid={`testimonial-dot-${i}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

