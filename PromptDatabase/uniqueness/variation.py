"""
Uniqueness Engine — Per-Idea Variation Seed
===========================================
The core fix for "all videos show the same pattern".

Today every prompt ends with the *identical* mandated beat — hardcoded at
prompt_chain_engine.py:591 and echoed in the STAGE_3 template:

    "the camera performs a continuous impossible-scale descent ... finally reaches a
     maximum close-up of a single harvested particle/grain beside a colossal quantum
     mechanism"

That single line is the "same last two seconds zooming into a small object" the user
sees on every video. Verified present in 35/35 Level-10 video prompts.

This module replaces that one fixed beat with an ARCHETYPE ROTATION: each idea gets a
different camera language, ending, mood, motif and HUD verb set, chosen deterministically
from `idea_id`. Deterministic matters — the same idea always regenerates identically, so
prompts stay reproducible and auditable (the project has no RNG anywhere by design).

Nothing here talks to the DB or the network; it is pure data + arithmetic, so it is
trivially testable and safe to import from anywhere.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, asdict


# ---------------------------------------------------------------------------
# Archetype pools
# ---------------------------------------------------------------------------
# Camera language for seconds 1-5 (how the machine is revealed).
CAMERA_ARCHETYPES: list[dict] = [
    {"key": "orbit",        "move": "a slow orbital arc circling the structure, revealing a new mechanism with every degree of rotation"},
    {"key": "ascend",       "move": "a continuous vertical ascent from ground level up along the structure's full height"},
    {"key": "pullback",     "move": "a relentless pull-back that starts tight on one moving part and widens until the whole colossus fits frame"},
    {"key": "flythrough",   "move": "an unbroken fly-through threading between the structure's limbs and internal gantries"},
    {"key": "lowangle",     "move": "a locked low-angle push-in from the ground, the structure looming and filling the vertical frame"},
    {"key": "crane_down",   "move": "a sweeping crane move descending from high above, the machine resolving out of atmospheric haze"},
    {"key": "tracking",     "move": "a lateral tracking shot travelling along the structure's working face at speed"},
    {"key": "spiral",       "move": "a spiralling descent that wraps the structure while closing distance"},
]

# The ENDING beat for seconds 6-8 — this is what must differ per idea.
ENDING_ARCHETYPES: list[dict] = [
    {"key": "cross_section", "end": "the outer shell peels away in one continuous move to expose a working cross-section of the internal mechanism, every layer moving in synchronised order"},
    {"key": "scale_human",   "end": "the camera settles beside a single human silhouette dwarfed at the structure's base, holding on the size contrast as the machine works overhead"},
    {"key": "wide_reveal",   "end": "the camera retreats to an extreme wide, revealing dozens more identical structures stretching to the horizon in formation"},
    {"key": "power_surge",   "end": "energy floods the full length of the structure in one travelling wave and every system reaches synchronised full output"},
    {"key": "silhouette",    "end": "the machine falls into stark silhouette against a vast sky as its running lights ignite in sequence"},
    {"key": "product_out",   "end": "the finished output emerges from the discharge point in a continuous stream and the camera follows it away from the machine"},
    {"key": "top_down",      "end": "the camera rises to a straight top-down orthographic view, the structure reading as a vast geometric pattern on the landscape"},
    {"key": "weather_shift", "end": "the surrounding weather turns as the structure keeps working, unmoved, the environment reacting to its operation"},
    {"key": "time_lapse",    "end": "the light races through a full day cycle while the structure continues its rhythm without pause"},
    {"key": "interior_rest", "end": "the camera comes to rest inside the control heart of the machine, surrounded by moving readouts and mechanism"},
]

# Visual mood — drives palette/lighting so two ideas don't share a look.
MOOD_ARCHETYPES: list[dict] = [
    {"key": "dawn",      "mood": "cold blue pre-dawn light, long shadows, mist pooling at the base"},
    {"key": "golden",    "mood": "low golden-hour sun, warm rim light, dust suspended in the air"},
    {"key": "overcast",  "mood": "flat overcast diffusion, desaturated industrial palette, wet reflective surfaces"},
    {"key": "night",     "mood": "deep night, hard artificial floodlights, strong pools of light and darkness"},
    {"key": "storm",     "mood": "storm light, heavy moving cloud, intermittent lightning raking the structure"},
    {"key": "harsh_noon","mood": "harsh vertical noon sun, bleached highlights, sharp black shadows"},
    {"key": "aurora",    "mood": "high-latitude aurora glow, cool green-violet sky, crisp cold air"},
    {"key": "dust",      "mood": "amber dust-laden atmosphere, heavy particulate haze, sun as a dim disc"},
]

# Structural motif — changes the machine's FORM, not just its lighting.
# This is what stops "a tree surrounded by machines" repeating.
FORM_MOTIFS: list[dict] = [
    {"key": "bridge",     "form": "a vast horizontal span carried on repeating support legs, working along its underside"},
    {"key": "tower",      "form": "a single slender vertical tower with stacked working tiers ascending its height"},
    {"key": "ring",       "form": "an enormous closed ring or torus rotating about a central void"},
    {"key": "burrower",   "form": "a mostly-buried machine, only its intake and spoil structures breaking the surface"},
    {"key": "walker",     "form": "an articulated multi-legged walking chassis that repositions itself across terrain"},
    {"key": "canopy",     "form": "a broad flat overhead canopy suspended above the working surface on thin masts"},
    {"key": "spine",      "form": "a long segmented spine that flexes and articulates along its length"},
    {"key": "hive",       "form": "a dense honeycomb mass of repeating cells with material moving between them"},
    {"key": "crawler",    "form": "a low continuous-track crawler chassis, immensely wide and slow"},
    {"key": "floating",   "form": "a suspended aerial platform held aloft, tethered to the ground by cables"},
]

# HUD step verb sets — replaces the fixed AWAKEN -> PURIFICATION arc.
HUD_VERB_SETS: list[list[str]] = [
    ["CALIBRATE", "ENGAGE", "CONVEY", "SEPARATE", "DISCHARGE"],
    ["POWER UP", "EXTEND", "INTAKE", "REFINE", "STORE"],
    ["UNLOCK", "UNFOLD", "GATHER", "COMPRESS", "RELEASE"],
    ["INITIALIZE", "ALIGN", "DRAW IN", "TRANSFORM", "OUTPUT"],
    ["SPIN UP", "DEPLOY", "CHANNEL", "FILTER", "DELIVER"],
    ["WAKE", "REACH", "COLLECT", "PROCESS", "EMIT"],
    ["PRIME", "LOCK ON", "HARVEST", "SORT", "LOAD"],
    ["IGNITE", "SWEEP", "LIFT", "DISTILL", "EJECT"],
]

# Pacing — how the 8 seconds are divided, so not every video is 5 beats + 3.
PACING_ARCHETYPES: list[dict] = [
    {"key": "5plus3", "beats": 5, "hud_seconds": 5, "desc": "five one-second HUD beats then a three-second unbroken closing move"},
    {"key": "4plus4", "beats": 4, "hud_seconds": 4, "desc": "four HUD beats over the first four seconds then a four-second closing move"},
    {"key": "3plus5", "beats": 3, "hud_seconds": 3, "desc": "three slower HUD beats then a long five-second closing move"},
    {"key": "6plus2", "beats": 6, "hud_seconds": 6, "desc": "six rapid HUD beats then a short two-second closing accent"},
]


@dataclass
class Variation:
    """The resolved creative fingerprint for one idea."""
    idea_id: int
    seed: int
    camera_key: str
    camera_move: str
    ending_key: str
    ending: str
    mood_key: str
    mood: str
    form_key: str
    form: str
    hud_verbs: list[str]
    pacing_key: str
    pacing_beats: int
    pacing_desc: str

    def to_dict(self) -> dict:
        return asdict(self)

    def signature(self) -> str:
        """Short human-readable fingerprint, handy in audit output."""
        return (f"{self.form_key}/{self.camera_key}/{self.ending_key}"
                f"/{self.mood_key}/{self.pacing_key}")


def _seed_for(idea_id: int, salt: str = "") -> int:
    """
    Stable seed derived from idea_id. Uses sha256 rather than hash() because
    Python's hash() is randomised per-process for strings, which would make
    prompts non-reproducible across runs.
    """
    h = hashlib.sha256(f"{idea_id}|{salt}".encode("utf-8")).hexdigest()
    return int(h[:12], 16)


def get_variation(idea_id: int, salt: str = "") -> Variation:
    """
    Resolve the creative fingerprint for an idea.

    Independent salts per dimension mean two ideas that happen to collide on the
    camera archetype will still differ on ending/mood/form — the dimensions do not
    move in lockstep the way a single modulo would make them.
    """
    cam = CAMERA_ARCHETYPES[_seed_for(idea_id, salt + "cam") % len(CAMERA_ARCHETYPES)]
    end = ENDING_ARCHETYPES[_seed_for(idea_id, salt + "end") % len(ENDING_ARCHETYPES)]
    mood = MOOD_ARCHETYPES[_seed_for(idea_id, salt + "mood") % len(MOOD_ARCHETYPES)]
    form = FORM_MOTIFS[_seed_for(idea_id, salt + "form") % len(FORM_MOTIFS)]
    verbs = HUD_VERB_SETS[_seed_for(idea_id, salt + "hud") % len(HUD_VERB_SETS)]
    pace = PACING_ARCHETYPES[_seed_for(idea_id, salt + "pace") % len(PACING_ARCHETYPES)]

    return Variation(
        idea_id=idea_id,
        seed=_seed_for(idea_id, salt),
        camera_key=cam["key"], camera_move=cam["move"],
        ending_key=end["key"], ending=end["end"],
        mood_key=mood["key"], mood=mood["mood"],
        form_key=form["key"], form=form["form"],
        hud_verbs=list(verbs),
        pacing_key=pace["key"], pacing_beats=pace["beats"], pacing_desc=pace["desc"],
    )


def combination_space() -> int:
    """Total distinct fingerprints available (for reporting)."""
    return (len(CAMERA_ARCHETYPES) * len(ENDING_ARCHETYPES) * len(MOOD_ARCHETYPES)
            * len(FORM_MOTIFS) * len(HUD_VERB_SETS) * len(PACING_ARCHETYPES))


def collision_report(idea_ids: list[int]) -> dict:
    """
    How many of these ideas share an identical fingerprint? Used by audit.py to
    prove the variation layer actually spreads ideas apart.
    """
    from collections import Counter
    sigs = [get_variation(i).signature() for i in idea_ids]
    ctr = Counter(sigs)
    dupes = {s: n for s, n in ctr.items() if n > 1}
    return {
        "ideas": len(idea_ids),
        "distinct_signatures": len(ctr),
        "colliding_signatures": len(dupes),
        "ideas_in_collision": sum(dupes.values()),
        "combination_space": combination_space(),
    }
