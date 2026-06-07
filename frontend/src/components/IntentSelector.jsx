import React from "react";
import { useNavigate } from "react-router-dom";
import { useSurface } from "../hooks/useSurface";
import { useSmartSite } from "../context/SmartSiteContext";
import { PawPrint } from "lucide-react";

/**
 * The "Animals We Serve" parent-animal selector.
 *
 * Clicking a card fires an intent signal AND navigates to the
 * dedicated animal page (/dogs, /cats, /critters).
 */
export default function IntentSelector() {
  const { content, loading } = useSurface("intent_selector");
  const { setIntent, parentIntent } = useSmartSite();
  const navigate = useNavigate();

  if (loading || !content) return null;

  const cards = content.cards || [];

  const handleSelect = (card) => {
    if (card.intent) {
      setIntent(card.intent, null, { label: `intent_selector:${card.intent}` });
    }
    const href = card.intent === "critters" ? "/critters" : `/${card.intent}`;
    navigate(href);
  };

  return (
    <section className="mt-20" data-testid="intent-selector">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-red">
            Animals We Serve
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-clinic-navy mt-3">
            {content.heading || "Start with your pet."}
          </h2>
          {content.subheading && (
            <p className="text-clinic-mist mt-2 max-w-xl">{content.subheading}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        {cards.map((card, i) => {
          const active = parentIntent && card.intent === parentIntent;
          return (
            <button
              key={`${card.intent}-${i}`}
              onClick={() => handleSelect(card)}
              className={`group relative text-left rounded-[1.5rem] overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_rgba(0,0,0,0.08)] border ${
                active
                  ? "border-clinic-red bg-clinic-red-soft ring-2 ring-clinic-red/40"
                  : "border-sand-300/60 bg-white"
              }`}
              data-testid={`intent-card-${card.intent}`}
            >
              {card.image && (
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-6">
                <div className="font-display font-bold text-clinic-navy text-xl">{card.title}</div>
                <p className="text-sm text-clinic-mist mt-1.5 line-clamp-2">{card.description}</p>
                <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-clinic-red group-hover:text-clinic-red-hover transition-colors">
                  {active ? "Currently viewing" : "See care"}
                  <PawPrint className="h-3.5 w-3.5 transition-transform group-hover:rotate-12" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
