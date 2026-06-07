"""Intent inference engine.

Given a VisitorSession's accumulated intent_scores + sub_intent_scores,
this module resolves:
    - parent intent (dogs / cats / critters)
    - sub intent (e.g. new_puppy, wellness, health_concerns, senior, treatments)
    - best-matching Switch for a given Surface

Rule matching is simple and deterministic:
    1. Filter active switches on the surface.
    2. Each switch has a rule dict. Supported keys:
        {
          "intent": "dogs" | "cats" | "critters" | null,
          "sub_intent": "new_puppy" | "wellness" | ... | null,
          "min_page_views": 0
        }
       All present keys must match. null / missing = wildcard.
    3. Sort matches by priority ASC (lower = higher priority),
       then by rule specificity (both intent+sub_intent wins over just intent wins over wildcard).
    4. Return first match, else the surface's default_content.
"""
from __future__ import annotations

from typing import Any

PARENT_INTENTS = ("dogs", "cats", "critters")


def resolve_parent_intent(scores: dict[str, int]) -> str | None:
    if not scores:
        return None
    best = max(scores.items(), key=lambda kv: kv[1])
    if best[1] <= 0:
        return None
    return best[0]


def resolve_sub_intent(sub_scores: dict[str, int]) -> str | None:
    if not sub_scores:
        return None
    best = max(sub_scores.items(), key=lambda kv: kv[1])
    if best[1] <= 0:
        return None
    return best[0]


def _specificity(rule: dict[str, Any]) -> int:
    s = 0
    if rule.get("intent"):
        s += 2
    if rule.get("sub_intent"):
        s += 4
    if rule.get("min_page_views"):
        s += 1
    return s


def match_switch(
    switches: list[Any],
    intent: str | None,
    sub_intent: str | None,
    page_views: int,
) -> Any | None:
    """Find the highest-priority switch whose rule matches the session context."""
    candidates = []
    for sw in switches:
        if not getattr(sw, "active", True):
            continue
        rule = sw.rule or {}
        r_intent = rule.get("intent")
        r_sub = rule.get("sub_intent")
        r_min = int(rule.get("min_page_views") or 0)

        if r_intent and r_intent != intent:
            continue
        if r_sub and r_sub != sub_intent:
            continue
        if r_min and page_views < r_min:
            continue
        candidates.append(sw)

    if not candidates:
        return None

    candidates.sort(key=lambda s: (s.priority, -_specificity(s.rule or {})))
    return candidates[0]
