import React from "react";
import { Link } from "react-router-dom";
import { PawPrint, ChevronRight } from "lucide-react";
import { useSurface } from "../hooks/useSurface";
import { useSmartSite } from "../context/SmartSiteContext";

export default function FeaturedCare() {
  const { content, loading, matched } = useSurface("home_featured_care");
  const { track } = useSmartSite();

  if (loading || !content) return null;
  const cards = content.cards || [];
  const servicesLink = content.services_link || "/services";
  const servicesLabel = content.services_label || "View all services";

  return (
    <section className="mt-24" data-testid="featured-care" data-matched-switch={matched || "default"}>
      <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">Featured Care</div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-clinic-navy mt-3 max-w-2xl">
            {content.heading || "Comprehensive services for every life stage."}
          </h2>
          {content.subheading && (
            <p className="mt-2 text-clinic-mist max-w-xl">{content.subheading}</p>
          )}
        </div>
        <Link to={servicesLink} className="text-sm font-bold text-clinic-red hover:text-clinic-red-hover underline underline-offset-4 decoration-2" data-testid="featured-view-all">
          {servicesLabel}
        </Link>
      </div>

      <div className={`grid gap-5 ${cards.length <= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        {cards.map((card, i) => (
          <Link
            key={`${card.title}-${i}`}
            to={card.href || "/services"}
            onClick={() =>
              track({ signalType: "cta_click", label: `featured:${card.title}`, strength: 2 })
            }
            className="group bg-white rounded-2xl border border-sand-300/60 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)]"
            data-testid={`featured-card-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
          >
            {card.image && (
              <div className="h-40 overflow-hidden bg-sand-200">
                <img
                  src={card.image}
                  alt={card.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  style={card.objectPosition ? { objectPosition: card.objectPosition } : undefined}
                  loading="lazy"
                />
              </div>
            )}
            <div className="p-5">
              <div className="font-display font-bold text-clinic-navy text-base">{card.title}</div>
              <p className="text-sm text-clinic-mist mt-1.5 line-clamp-2">{card.description}</p>
              <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-clinic-red group-hover:text-clinic-red-hover transition-colors">
                Learn more <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
