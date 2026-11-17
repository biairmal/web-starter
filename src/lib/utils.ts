import { createCn } from "cn/config";

// The class merger, told about the theme's own type roles and spacing names
// (globals.css @theme). Without them it reads `text-small` as a colour and
// drops it next to `text-muted-foreground`, and never lets `p-2` replace
// `p-inset-md`. Add a name here when you add a `--text-*` or `--spacing-*`.
export const cn = createCn({
  extend: {
    theme: {
      text: ["stat", "title", "section", "body", "meta", "small", "mono"],
      spacing: [
        "gap",
        "pad",
        "card-pad",
        "section",
        "row",
        "row-md",
        "control",
        "field",
        "nav-row",
        "sheet-inset",
        "sidebar",
        "topbar",
        "input",
        "table-head",
        "button-xs",
        "button-sm",
        "button-md",
        "button-lg",
        "inset-xs",
        "inset-sm",
        "inset-md",
        "inset-lg",
        "stack-xs",
        "stack-sm",
        "stack-md",
        "stack-lg",
        "stack-xl",
        "inline-xs",
        "inline-sm",
        "inline-md",
        "inline-lg",
      ],
    },
  },
});
