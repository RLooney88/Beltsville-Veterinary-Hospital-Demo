"""Validate canonical smart-site template seed data.

Run from repo root:
    python backend/validate_seed.py

This protects template instances from missing smart-site data (for example
image-backed CTA content) and from leaking old practice-specific references.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Iterable

REPO_ROOT = Path(__file__).resolve().parents[1]
SEED_PATH = Path(__file__).parent / "seeds" / "smart_site_template.json"
PUBLIC_ROOT = REPO_ROOT / "frontend" / "public"

REQUIRED_SURFACES = {
    "home_hero": {"default_content": ["headline", "subheadline", "image_url"]},
    "intent_selector": {"default_content": ["heading", "cards"]},
    "sub_intent_prompt": {"default_content": ["heading", "cards"]},
    "home_featured_care": {"default_content": ["heading", "cards"]},
    "home_proof": {"default_content": ["heading", "testimonials"]},
    "home_faq": {"default_content": ["heading", "items"]},
    "appointment_intro": {"default_content": ["headline", "subheadline"]},
    "inline_cta": {"default_content": ["headline", "body", "primary_cta_label", "primary_cta_href", "image_url", "imagePosition"]},
}

REQUIRED_SWITCHES = {
    "home_hero": [
        {"intent": "dogs"},
        {"intent": "dogs", "sub_intent": "new_puppy"},
        {"intent": "dogs", "sub_intent": "senior"},
        {"intent": "cats"},
        {"intent": "cats", "sub_intent": "new_kitten"},
        {"intent": "critters"},
        {"sub_intent": "health_concerns"},
    ],
    "sub_intent_prompt": [
        {"intent": "dogs"},
        {"intent": "cats"},
        {"intent": "critters"},
    ],
    "inline_cta": [
        {"intent": "dogs"},
        {"intent": "cats"},
        {"intent": "critters"},
    ],
}

FORBIDDEN_PATTERNS = [
    r"cdcssl\.ibsrv\.net",
    r"Annapolis",
    r"annapolis",
    r"AnnapolisVet",
    r"annapolisvet",
    r"Jennifer",
    r"410-224",
    r"224-6624",
    r"Kaitlin",
    r"Lester",
    r"Tanjii",
    r"Hamilton",
    r"Boback",
    r"roddylooney",
    r"rodericklooney",
]

IMAGE_KEYS = {"image", "image_url", "logo", "og_image", "twitter_image"}


def load_seed() -> dict[str, Any]:
    with SEED_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)


def walk(value: Any, path: str = "$") -> Iterable[tuple[str, Any]]:
    yield path, value
    if isinstance(value, dict):
        for k, v in value.items():
            yield from walk(v, f"{path}.{k}")
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from walk(v, f"{path}[{i}]")


def image_values(value: Any, path: str = "$") -> Iterable[tuple[str, str]]:
    if isinstance(value, dict):
        for k, v in value.items():
            child_path = f"{path}.{k}"
            if k in IMAGE_KEYS and isinstance(v, str) and v:
                yield child_path, v
            yield from image_values(v, child_path)
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from image_values(v, f"{path}[{i}]")


def local_public_path(url: str) -> Path | None:
    if not url.startswith("/"):
        return None
    # URL paths are always slash-separated; construct a platform-native path.
    return PUBLIC_ROOT.joinpath(*url.lstrip("/").split("/"))


def main() -> int:
    errors: list[str] = []
    seed = load_seed()
    surfaces = seed.get("surfaces")
    if not isinstance(surfaces, list):
        errors.append("Seed must contain a surfaces list")
        surfaces = []

    by_slug = {s.get("slug"): s for s in surfaces if isinstance(s, dict)}

    for slug, req in REQUIRED_SURFACES.items():
        surface = by_slug.get(slug)
        if not surface:
            errors.append(f"Missing required surface: {slug}")
            continue
        default_content = surface.get("default_content") or {}
        for key in req.get("default_content", []):
            if key not in default_content or default_content.get(key) in (None, ""):
                errors.append(f"{slug}.default_content missing required field: {key}")

    for slug, required_rules in REQUIRED_SWITCHES.items():
        switches = (by_slug.get(slug) or {}).get("switches") or []
        switch_rules = [sw.get("rule", {}) for sw in switches if isinstance(sw, dict)]
        for required_rule in required_rules:
            if required_rule not in switch_rules:
                errors.append(f"{slug} missing switch rule: {required_rule}")

    serialized = json.dumps(seed, ensure_ascii=False)
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, serialized):
            errors.append(f"Forbidden practice/client reference matched: {pattern}")

    for path, url in image_values(seed):
        if url.startswith(("http://", "https://")):
            errors.append(f"{path} uses external image URL; template seed images must be local: {url}")
            continue
        if url.startswith("/"):
            local = local_public_path(url)
            if local and not local.exists():
                errors.append(f"{path} references missing public asset: {url}")

    if errors:
        print("Smart-site seed validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"Smart-site seed validation passed: {SEED_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
