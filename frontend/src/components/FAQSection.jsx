import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { useSurface } from "../hooks/useSurface";
import { useSmartSite } from "../context/SmartSiteContext";

const INTENT_TAGS = {
  dogs: { label: "Dogs", tone: "bg-clinic-navy text-white" },
  cats: { label: "Cats", tone: "bg-clinic-red text-white" },
  critters: { label: "Critters", tone: "bg-clinic-forest text-white" },
};

const SUB_TAGS = {
  new_puppy: "New puppy",
  new_kitten: "New kitten",
  wellness: "Wellness",
  health_concerns: "Health concern",
  senior: "Senior care",
  treatments: "Treatment",
  husbandry: "Husbandry",
};

export default function FAQSection() {
  const { content, loading } = useSurface("home_faq");
  const { track } = useSmartSite();
  if (loading || !content) return null;
  const items = content.items || [];

  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);

  const renderItem = (it, i) => {
    const intentTag = it.intent && INTENT_TAGS[it.intent];
    const subTag = it.sub_intent && SUB_TAGS[it.sub_intent];
    return (
      <AccordionItem
        key={i}
        value={`item-${i}`}
        className="border-b border-sand-300/70"
        data-testid={`faq-item-${i}`}
      >
        <AccordionTrigger
          className="text-left font-display font-bold text-lg text-clinic-navy py-5 gap-4"
          onClick={() =>
            track({
              signalType: "faq_open",
              label: it.q,
              intent: it.intent || null,
              subIntent: it.sub_intent || null,
              strength: 2,
            })
          }
          data-testid={`faq-trigger-${i}`}
        >
          <span className="flex-1">{it.q}</span>
          <span className="hidden sm:flex items-center gap-1.5 shrink-0">
            {intentTag && (
              <span className={`text-[10px] uppercase tracking-widest font-bold rounded-full px-2.5 py-0.5 ${intentTag.tone}`}>
                {intentTag.label}
              </span>
            )}
            {subTag && (
              <span className="text-[10px] uppercase tracking-widest font-bold rounded-full px-2.5 py-0.5 bg-clinic-sage text-clinic-forest">
                {subTag}
              </span>
            )}
          </span>
        </AccordionTrigger>
        <AccordionContent className="text-clinic-mist pb-5 pr-8">
          {it.a}
        </AccordionContent>
      </AccordionItem>
    );
  };

  return (
    <section className="mt-24" data-testid="faq-section">
      <div className="bg-clinic-peach rounded-[2rem] p-10 border border-clinic-peachDeep/60 relative overflow-hidden mb-10">
        <div className="text-xs uppercase tracking-[0.22em] font-semibold text-clinic-red">FAQ</div>
        <h2 className="font-display text-3xl sm:text-4xl font-bold text-clinic-navy mt-3 max-w-2xl">
          {content.heading || "Answers that help you help your pet."}
        </h2>
        <p className="mt-4 text-clinic-navy/70 max-w-xl">
          Pick the closest question and we&rsquo;ll give you a straight answer. Don&rsquo;t see yours? Give us a call and we&rsquo;ll walk you through it.
        </p>
        <div className="absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-clinic-red/10 blur-3xl" />
      </div>

      <div className="grid gap-x-10 lg:grid-cols-2">
        <Accordion type="single" collapsible>
          {left.map((it, i) => renderItem(it, i))}
        </Accordion>
        <Accordion type="single" collapsible>
          {right.map((it, i) => renderItem(it, i + mid))}
        </Accordion>
      </div>
    </section>
  );
}
