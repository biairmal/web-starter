import { Controls } from "./controls";
import { Feedback } from "./feedback";
import { Foundations } from "./foundations";
import { Overlays } from "./overlays";

// The development-only component gallery: every shared component in its
// variants and states, on one page, inside the real app shell.

const INDEX = [
  [
    "Foundations",
    [
      ["colors", "Colour"],
      ["typography", "Typography"],
      ["spacing", "Spacing and radius"],
    ],
  ],
  [
    "Controls",
    [
      ["button", "Button"],
      ["input", "Input and field"],
      ["checkbox", "Checkbox"],
    ],
  ],
  [
    "Overlays",
    [
      ["dialog", "Dialog"],
      ["sheet", "Sheet"],
      ["menu", "Dropdown menu"],
      ["popover", "Popover and tooltip"],
    ],
  ],
  [
    "Feedback",
    [
      ["badge", "Badge"],
      ["toast", "Toast"],
      ["skeleton", "Skeleton"],
      ["states", "Empty and error"],
    ],
  ],
] as const;

export function ComponentGallery() {
  return (
    <div className="flex flex-col gap-stack-lg lg:flex-row lg:items-start lg:gap-section">
      <nav
        aria-label="Components"
        className="lg:sticky lg:top-inset-lg lg:w-48 lg:shrink-0"
      >
        <ul className="flex flex-wrap gap-x-inline-lg gap-y-stack-sm lg:flex-col lg:gap-stack-md">
          {INDEX.map(([group, items]) => (
            <li key={group} className="flex flex-col gap-stack-xs">
              <span className="text-small font-medium text-muted-foreground">
                {group}
              </span>
              <ul className="flex flex-wrap gap-x-inline-md lg:flex-col lg:gap-stack-xs">
                {items.map(([id, label]) => (
                  <li key={id}>
                    <a
                      href={`#${id}`}
                      className="text-meta text-foreground underline-offset-4 hover:underline"
                    >
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-1 flex-col gap-section">
        <Foundations />
        <Controls />
        <Overlays />
        <Feedback />
      </div>
    </div>
  );
}
