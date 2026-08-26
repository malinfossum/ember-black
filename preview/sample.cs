// Contrast.cs — WCAG relative luminance for the Ember ramp

using System.Globalization;
using System.Runtime.CompilerServices;

namespace Ember.Ramp;

/// <summary>Which way a variant's greys lean off neutral.</summary>
public enum Cast { Cool, Neutral, Warm }

/// <summary>A variant is a canvas level and a per-channel bias. Everything else derives.</summary>
public readonly record struct Variant(string Label, Cast Cast, int Level, double[] Tint);

public static class Contrast
{
    private const double SrgbKnee = 0.03928;

    public static readonly Variant[] Variants =
    [
        new("Ember Black", Cast.Neutral, 0, [0, 0, 0]),
        new("Ember Ink", Cast.Cool, 22, [-0.055, -0.02, 0]),
        new("Ember Slate", Cast.Cool, 30, [-0.055, -0.02, 0]),
    ];

    /// <summary>Variants by label, for the build script's lookup.</summary>
    public static readonly Dictionary<string, Variant> ByLabel =
        Variants.ToDictionary(v => v.Label, v => v);

    [MethodImpl(MethodImplOptions.AggressiveInlining)]
    private static double ToLinear(int channel)
    {
        var v = channel / 255.0;
        return v <= SrgbKnee ? v / 12.92 : Math.Pow((v + 0.055) / 1.055, 2.4);
    }

    /// <summary>Relative luminance of a <c>#rrggbb</c> color, per WCAG 2.1.</summary>
    public static double Luminance(string? hex)
    {
        if (hex is not { Length: 7 } || hex[0] != '#')
            throw new FormatException($"Not a hex color: {hex ?? "null"}");

        var channels = new[] { 1, 3, 5 }
            .Select(i => int.Parse(hex.AsSpan(i, 2), NumberStyles.HexNumber))
            .Select(ToLinear)
            .ToArray();

        return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    }

    /// <summary>Contrast ratio — 1:1 for identical colors, 21:1 for black on white.</summary>
    public static double Between(string a, string b)
    {
        double la = Luminance(a), lb = Luminance(b);
        var (hi, lo) = la >= lb ? (la, lb) : (lb, la);
        return (hi + 0.05) / (lo + 0.05);
    }

    /// <summary>The tinted grey for a variant, capped so the bias stays a whisper.</summary>
    public static int[] Grey(Variant v) =>
        [.. v.Tint.Select(bias => (int)Math.Round(v.Level + bias * Math.Min(v.Level, 90)))];

    public static void Main()
    {
        var ink = ByLabel["Ember Ink"];
        var ratio = Between("#d1d4d6", "#151616");
        Console.WriteLine($"{ink.Label} — canvas {string.Join(", ", Grey(ink))}, text {ratio:F2}:1");
    }
}
