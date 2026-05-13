"""Mémoire conversationnelle légère pour le conseiller vendeur Aya (tokens réduits)."""

from __future__ import annotations

import re
from typing import Any

MAX_HISTORY_MESSAGES = 10

_NOISE_USER = re.compile(
    r"^\s*(ok|okay|d['’]accord|merci|thanks?|thank\s+you|super|parfait|nickel|top|génial|genial|👍|🙏)\s*\.{0,3}\s*$",
    re.IGNORECASE,
)
_GREETING_ONLY = re.compile(
    r"^\s*(bonjour|bonsoir|salut|coucou|hello|hey|yo)\b[\s!.]*$",
    re.IGNORECASE,
)


def is_noise_message(content: str, role: str, *, prior_useful_count: int = 0) -> bool:
    """Filtre les tours peu utiles pour le contexte LLM (ok, merci, salutations répétées)."""
    text = (content or "").strip()
    if not text:
        return True
    if role != "user":
        return False
    if len(text) > 120:
        return False
    if _NOISE_USER.match(text):
        return True
    if _GREETING_ONLY.match(text) and prior_useful_count >= 2:
        return True
    return False


def trim_history(turns: list[dict[str, Any]]) -> list[dict[str, str]]:
    """Conserve uniquement les derniers échanges utiles (plafonné)."""
    useful: list[dict[str, str]] = []
    for t in turns:
        role = str(t.get("role", ""))
        content = str(t.get("content", ""))
        if role not in ("user", "assistant"):
            continue
        prior = len(useful)
        if is_noise_message(content, role, prior_useful_count=prior):
            continue
        useful.append({"role": role, "content": content})
    trimmed = useful[-MAX_HISTORY_MESSAGES:]
    return trimmed


def format_history_for_prompt(turns: list[dict[str, str]], max_chars_per_turn: int = 500) -> str:
    if not turns:
        return "(aucun échange récent utile)"
    lines: list[str] = []
    for t in turns:
        label = "CLIENT" if t["role"] == "user" else "AYA"
        c = t["content"].strip().replace("\n", " ")
        if len(c) > max_chars_per_turn:
            c = c[: max_chars_per_turn - 1] + "…"
        lines.append(f"{label}: {c}")
    return "\n".join(lines)


def build_context(
    *,
    business_type: str | None,
    memory_hint: str | None,
    vendor_context: str | None,
    history_text: str,
    message: str,
) -> tuple[str, str]:
    """
    Retourne (system_instruction, user_block) pour injection modèle.
    Court pour compatibilité Groq/Gemini et coût tokens réduit.
    """
    system = (
        "Tu es Aya, conseillère vente AyaMarket (Bénin). Réponses courtes, actionnables, "
        "français simple. Tu utilises le CONTEXTE boutique et l'HISTORIQUE utile ci-dessous. "
        "Ne répète pas les salutations inutilement."
    )
    mem = (memory_hint or "").strip() or "—"
    vctx = (vendor_context or "").strip() or "—"
    biz = (business_type or "").strip() or "commerce local"
    user_block = (
        f"[BOUTIQUE] {biz}\n"
        f"[MÉMOIRE / PRÉFÉRENCES]\n{mem}\n\n"
        f"[CONTEXTE DONNÉES]\n{vctx}\n\n"
        f"[HISTORIQUE]\n{history_text}\n\n"
        f"[MESSAGE]\n{message.strip()}"
    )
    return system, user_block
