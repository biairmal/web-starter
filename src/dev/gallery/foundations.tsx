import { Text } from "@/components/ui/typography";
import { Demo, Section } from "./section";

// The tokens themselves, read live from tokens.css through CSS variables, so
// this page always shows the current values in the current theme.

const COLORS = [
  ["frame", "surface", "raised", "active"],
  ["text", "muted", "faint"],
  ["border", "rule", "control"],
  ["primary", "primary-hover", "primary-press", "brand-accent"],
  ["positive", "warning", "negative"],
  [
    "pill-positive-bg",
    "pill-warning-bg",
    "pill-negative-bg",
    "pill-neutral-bg",
  ],
] as const;

const TYPE = [
  ["stat", "1,284"],
  ["title", "Page title"],
  ["section", "Section title"],
  ["body", "Body text for paragraphs and table cells."],
  ["label", "Label"],
  ["secondary", "Secondary text for descriptions and metadata."],
  ["caption", "Caption, hint or timestamp"],
  ["mono", "a3f9-41c2-8e17"],
] as const;

const SPACING = [
  ["inset", ["xs", "sm", "md", "lg"]],
  ["stack", ["xs", "sm", "md", "lg", "xl"]],
  ["inline", ["xs", "sm", "md", "lg"]],
] as const;

const RADII = ["chip", "control", "card", "sheet"] as const;

export function Foundations() {
  return (
    <>
      <Section id="colors" title="Colour" source="src/app/tokens.css">
        {COLORS.map((row) => (
          <div key={row[0]} className="flex flex-wrap gap-inline-md">
            {row.map((name) => (
              <div key={name} className="flex w-36 flex-col gap-stack-xs">
                <div
                  className="h-12 rounded-md border border-border"
                  style={{ background: `var(--${name})` }}
                />
                <Text variant="mono" as="code">
                  {`--${name}`}
                </Text>
              </div>
            ))}
          </div>
        ))}
      </Section>

      <Section
        id="typography"
        title="Typography"
        source="src/components/ui/typography.tsx"
      >
        <div className="flex flex-col gap-stack-md">
          {TYPE.map(([variant, sample]) => (
            <div
              key={variant}
              className="flex flex-col gap-stack-xs sm:flex-row sm:items-baseline sm:gap-inline-lg"
            >
              <Text variant="caption" className="sm:w-24 sm:shrink-0">
                {variant}
              </Text>
              {variant === "title" ? (
                <Text as="div" className="text-title font-semibold">
                  {sample}
                </Text>
              ) : variant === "section" ? (
                <Text as="div" className="text-section font-semibold">
                  {sample}
                </Text>
              ) : (
                <Text as="div" variant={variant}>
                  {sample}
                </Text>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="spacing"
        title="Spacing and radius"
        source="src/app/tokens.css"
      >
        {SPACING.map(([group, steps]) => (
          <Demo key={group} label={`--space-${group}-*`}>
            {steps.map((step) => (
              <div
                key={step}
                className="flex flex-col items-start gap-stack-xs"
              >
                <div
                  className="h-4 rounded-sm bg-brand-accent"
                  style={{ width: `var(--space-${group}-${step})` }}
                />
                <Text variant="caption">{step}</Text>
              </div>
            ))}
          </Demo>
        ))}
        <Demo label="--radius-*">
          {RADII.map((name) => (
            <div key={name} className="flex flex-col items-center gap-stack-xs">
              <div
                className="size-16 border border-control bg-raised"
                style={{ borderRadius: `var(--radius-${name})` }}
              />
              <Text variant="caption">{name}</Text>
            </div>
          ))}
        </Demo>
      </Section>
    </>
  );
}
