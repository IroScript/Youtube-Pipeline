"""
SEO Engine — Deterministic Scoring ("Calculator")
=================================================
Per SEO_Discussion.txt: *"Python/rules = calculator, LLM = brain."* Scores must be
reproducible and auditable, so NOTHING in this module calls an LLM. Same input
always yields the same score, which means the numbers can be trusted in the DB
and compared across runs.

Produces, for one idea:
  * keyword metrics  — relevance + long-tail value per candidate keyword
  * novelty score    — how unexplored the exact concept is (0-100)
  * saturation score — how strong/entrenched the existing competitors are (0-100)
  * demand score     — how much real search appetite exists (0-100)
  * opportunity score— weighted composite (0-100) + a publish/skip verdict

Competitor classification follows the 3-level model from the discussion:
  EXACT      — same concept, near-identical title overlap
  CLOSE      — same underlying subject, different framing
  SUBSTITUTE — competes for the same attention, different concept
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field, asdict

from . import config
from .harvest import Competitor, HarvestResult


_STOP = {
    "the", "a", "an", "of", "and", "or", "in", "on", "for", "to", "with", "that",
    "this", "is", "are", "was", "it", "at", "by", "from", "as", "how", "what",
    "why", "you", "your", "my", "we", "i", "video", "shorts", "youtube",
}


def _tokens(text: str) -> set[str]:
    words = re.findall(r"[a-z0-9]+", (text or "").lower())
    return {w for w in words if w not in _STOP and len(w) > 2}


def _jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _clamp(v: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, v))


# ---------------------------------------------------------------------------
# Competitor classification
# ---------------------------------------------------------------------------
@dataclass
class ClassifiedCompetitor:
    title: str
    channel: str
    url: str
    view_count: int
    similarity: float
    level: str          # EXACT | CLOSE | SUBSTITUTE | IRRELEVANT
    is_strong: bool


def classify_competitors(idea_title: str, competitors: list[Competitor]) -> list[ClassifiedCompetitor]:
    idea_tokens = _tokens(idea_title)
    out: list[ClassifiedCompetitor] = []
    for c in competitors:
        sim = _jaccard(idea_tokens, _tokens(c.title))
        if sim >= 0.55:
            level = "EXACT"
        elif sim >= 0.30:
            level = "CLOSE"
        elif sim >= 0.12:
            level = "SUBSTITUTE"
        else:
            level = "IRRELEVANT"
        views = c.view_count or 0
        out.append(
            ClassifiedCompetitor(
                title=c.title,
                channel=c.channel,
                url=c.url,
                view_count=views,
                similarity=round(sim, 4),
                level=level,
                is_strong=views >= config.SATURATION_STRONG_VIEWS,
            )
        )
    return out


# ---------------------------------------------------------------------------
# Keyword metrics
# ---------------------------------------------------------------------------
@dataclass
class KeywordMetric:
    keyword: str
    relevance: float      # 0-1 overlap with the idea
    word_count: int
    long_tail: bool
    score: float          # 0-100 composite worth of targeting this keyword


def score_keywords(idea_title: str, topic: str, keywords: list[str]) -> list[KeywordMetric]:
    base = _tokens(idea_title) | _tokens(topic)
    metrics: list[KeywordMetric] = []
    for kw in keywords:
        rel = _jaccard(base, _tokens(kw))
        wc = len(kw.split())
        long_tail = wc >= 3
        # Long-tail keywords are easier to rank for; relevance dominates.
        score = _clamp(rel * 70 + (18 if long_tail else 6) + min(12, wc * 2))
        metrics.append(
            KeywordMetric(
                keyword=kw,
                relevance=round(rel, 4),
                word_count=wc,
                long_tail=long_tail,
                score=round(score, 2),
            )
        )
    metrics.sort(key=lambda m: m.score, reverse=True)
    return metrics


# ---------------------------------------------------------------------------
# Composite scores
# ---------------------------------------------------------------------------
@dataclass
class OpportunityReport:
    idea_id: int
    idea_title: str
    demand_score: float = 0.0
    novelty_score: float = 0.0
    saturation_score: float = 0.0       # HIGH = crowded (bad)
    opportunity_score: float = 0.0
    verdict: str = "unknown"            # publish | promising | crowded | insufficient_data
    exact_competitors: int = 0
    close_competitors: int = 0
    substitute_competitors: int = 0
    strong_competitors: int = 0
    top_keywords: list[str] = field(default_factory=list)
    classified: list[ClassifiedCompetitor] = field(default_factory=list)
    keyword_metrics: list[KeywordMetric] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        d = asdict(self)
        return d

    def summary_line(self) -> str:
        return (
            f"opportunity={self.opportunity_score:.0f}/100 "
            f"(demand={self.demand_score:.0f} novelty={self.novelty_score:.0f} "
            f"saturation={self.saturation_score:.0f}) "
            f"exact={self.exact_competitors} close={self.close_competitors} "
            f"-> {self.verdict.upper()}"
        )


def score_idea(harvest: HarvestResult) -> OpportunityReport:
    """Turn raw harvested signals into deterministic, auditable scores."""
    rep = OpportunityReport(idea_id=harvest.idea_id, idea_title=harvest.idea_title)

    classified = classify_competitors(harvest.idea_title, harvest.competitors)
    rep.classified = classified
    rep.exact_competitors = sum(1 for c in classified if c.level == "EXACT")
    rep.close_competitors = sum(1 for c in classified if c.level == "CLOSE")
    rep.substitute_competitors = sum(1 for c in classified if c.level == "SUBSTITUTE")
    rep.strong_competitors = sum(1 for c in classified if c.is_strong and c.level in ("EXACT", "CLOSE"))

    kms = score_keywords(harvest.idea_title, harvest.topic, harvest.keywords)
    rep.keyword_metrics = kms
    rep.top_keywords = [k.keyword for k in kms[:12]]

    # --- Demand: breadth of autocomplete universe + relevance of the best terms.
    # Autocomplete only returns a phrase if real users search it, so breadth is a
    # genuine (if coarse) demand proxy.
    if harvest.keywords:
        breadth = min(1.0, len(harvest.keywords) / 40.0)
        top_rel = sum(k.relevance for k in kms[:10]) / max(1, len(kms[:10]))
        rep.demand_score = round(_clamp(breadth * 55 + top_rel * 45), 2)
    else:
        rep.notes.append("no keyword data -> demand unscored")

    # --- Novelty: start at 100, subtract for each exact/close competitor.
    # An empty result only means "unexplored" if the search actually RAN.
    if harvest.competitors:
        novelty = 100.0
        novelty -= rep.exact_competitors * config.NOVELTY_EXACT_PENALTY
        novelty -= rep.close_competitors * (config.NOVELTY_EXACT_PENALTY / 3.0)
        rep.novelty_score = round(_clamp(novelty), 2)
    elif harvest.competitor_search_ran:
        # Searched and found nothing at all: this is the content white space the
        # SEO_Discussion strategy is hunting for.
        rep.novelty_score = 100.0
        rep.notes.append("competitor search returned zero results -> maximum novelty")
    else:
        rep.notes.append("competitor search unavailable -> novelty unscored")

    # --- Saturation: how entrenched the field is.
    # Two independent factors, because "one viral rival" is NOT the same as
    # "a crowded niche": we combine rival STRENGTH (log-damped view mass) with
    # rival DENSITY (how many direct rivals exist at all). A single strong video
    # in an otherwise empty field must not peg saturation at 100 — that would
    # mislabel genuine content white space as crowded.
    if harvest.competitors:
        rivals = [c for c in classified if c.level in ("EXACT", "CLOSE")]
        if rivals:
            views = [c.view_count for c in rivals]
            mass = sum(math.log10(v + 10) for v in views) / len(views)
            strength = _clamp((mass - 1) / 5.0 * 100)      # 0..100 avg rival strength
            density = min(1.0, len(rivals) / 8.0)          # 8+ direct rivals = full density
            rep.saturation_score = round(_clamp(strength * density), 2)
        else:
            rep.saturation_score = 0.0

    # --- Opportunity composite. Only meaningful when we could actually measure
    # both halves; otherwise say so instead of emitting a confident-looking number.
    measurable = (harvest.keywords or harvest.keyword_search_ran) and harvest.competitor_search_ran
    if measurable:
        w = config.OPPORTUNITY_WEIGHTS
        rep.opportunity_score = round(
            _clamp(
                rep.demand_score * w["demand"]
                + rep.novelty_score * w["novelty"]
                + (100 - rep.saturation_score) * w["low_saturation"]
            ),
            2,
        )
        if rep.opportunity_score >= 70:
            rep.verdict = "publish"
        elif rep.opportunity_score >= 50:
            rep.verdict = "promising"
        else:
            rep.verdict = "crowded"
    else:
        rep.verdict = "insufficient_data"
        rep.notes.append(
            "opportunity not scored: "
            + ("competitor search unavailable" if not harvest.competitor_search_ran
               else "keyword source unavailable")
        )

    rep.notes.extend(harvest.notes)
    return rep
