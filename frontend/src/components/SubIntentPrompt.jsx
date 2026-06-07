import React from "react";
import { useNavigate } from "react-router-dom";
import { useSurface } from "../hooks/useSurface";
import { useSmartSite } from "../context/SmartSiteContext";
import { PawPrint } from "lucide-react";

/**
 * Optional deepening section. Only renders when the session has a parent
 * intent (Dogs / Cats / Critters). Each card sets the sub-intent and routes
 * the visitor to the appointment form so they can schedule from here.
 */
export default function SubIntentPrompt() {
  const { content, loading, matched } = useSurface("sub_intent_prompt");
  const { setIntent, parentIntent, subIntent } = useSmartSite();
  const navigate = useNavigate();

  // Don't show until we know which animal we're on
  if (!parentIntent) return null;
  if (loading || !content) return null;

  const cards = content.cards || [];
  if (cards.length === 0) return null;

  const handleSelect = async (card) => {
    if (card.sub_intent) {
      await setIntent(card.intent || parentIntent, card.sub_intent, {
        label: `sub_intent_prompt:${card.sub_intent}`,
      });
    }
    // Take them to the appointment form, pre-filling the reason-for-visit hint
    const params = new URLSearchParams();
    if (card.sub_intent) params.set("reason", card.sub_intent);
    navigate(`/appointment?${params.toString()}`);
  };

  return (
    <section className="mt-16" data-testid="sub-intent-prompt" data-matched-switch={matched || "default"}>
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
        <div>
          <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-forest">
            Get more specific
          </div>
          <h3 className="font-display text-2xl sm:text-3xl font-bold text-clinic-navy mt-2">
            {content.heading || "What are we helping with?"}
          </h3>
          {content.subheading && (
            <p className="text-clinic-mist mt-2 max-w-xl">{content.subheading}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card, i) => {
          const active = subIntent && card.sub_intent === subIntent;
          return (
            <button
              key={`${card.sub_intent}-${i}`}
              onClick={() => handleSelect(card)}
              className={`group relative text-left rounded-[1.25rem] overflow-hidden transition-all duration-300 hover:-translate-y-1.5 border ${
                active
                  ? "border-clinic-red bg-clinic-red-soft ring-2 ring-clinic-red/40"
                  : "border-sand-300/60 bg-white hover:shadow-[0_20px_40px_rgba(0,0,0,0.06)]"
              }`}
              data-testid={`sub-intent-card-${card.sub_intent}`}
            >
              {card.image && (
                <div className="relative h-32 overflow-hidden">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="font-display font-bold text-clinic-navy text-base leading-tight">
                  {card.title}
                </div>
                <p className="text-xs text-clinic-mist mt-1.5 line-clamp-2">{card.description}</p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-clinic-red">
                  {active ? "Book a visit" : "Book for this"}
                  <PawPrint className="h-3 w-3 transition-transform group-hover:rotate-12" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
