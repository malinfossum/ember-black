"""contrast.py — WCAG relative luminance for the Ember ramp."""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum
from functools import cache

SRGB_KNEE = 0.03928
HEX_PAIRS = (1, 3, 5)


class Cast(StrEnum):
    """Which way a variant's greys lean off neutral."""

    COOL = "cool"
    NEUTRAL = "neutral"
    WARM = "warm"


@dataclass(frozen=True, slots=True)
class Variant:
    """A variant is a canvas level and a per-channel bias. Everything else derives."""

    label: str
    cast: Cast
    level: int
    tint: tuple[float, float, float]

    @property
    def is_lifted(self) -> bool:
        return self.level > 0


VARIANTS: list[Variant] = [
    Variant("Ember Black", Cast.NEUTRAL, 0, (0.0, 0.0, 0.0)),
    Variant("Ember Ink", Cast.COOL, 22, (-0.055, -0.02, 0.0)),
    Variant("Ember Slate", Cast.COOL, 30, (-0.055, -0.02, 0.0)),
]

BY_LABEL: dict[str, Variant] = {v.label: v for v in VARIANTS}


@cache
def to_linear(channel: int) -> float:
    v = channel / 255
    return v / 12.92 if v <= SRGB_KNEE else ((v + 0.055) / 1.055) ** 2.4


def luminance(hex_color: str) -> float:
    """Relative luminance of a ``#rrggbb`` color, per WCAG 2.1."""
    if len(hex_color) != 7 or not hex_color.startswith("#"):
        raise ValueError(f"Not a hex color: {hex_color!r}")

    r, g, b = (to_linear(int(hex_color[i : i + 2], 16)) for i in HEX_PAIRS)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: str, b: str) -> float:
    """Contrast ratio — 1:1 for identical colors, 21:1 for black on white."""
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def grey(variant: Variant, at: int | None = None) -> list[int]:
    """The tinted grey, capped so the bias stays a whisper at the light end."""
    level = variant.level if at is None else at
    scale = min(level, 90)
    return [round(level + bias * scale) for bias in variant.tint]


if __name__ == "__main__":
    ink = BY_LABEL["Ember Ink"]
    ratio = contrast("#d1d4d6", "#151616")

    match ink.cast:
        case Cast.COOL:
            print(f"{ink.label} — canvas {grey(ink)}, text {ratio:.2f}:1")
        case _:
            print(f"{ink.label} is not lifted")
