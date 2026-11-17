import { createCn } from "cn/config";

// The class merger, told about the theme's own type roles and spacing names
// (globals.css @theme). Without them it reads `text-small` as a colour and
// drops it next to `text-muted-foreground`, and never lets `p-2` replace
// `p-inset-md`. Add a name here when you add a `--text-*`, `--spacing-*` or `--container-*`.
export const cn = createCn({
  extend: {
    theme: {
      container: ["dialog-sm", "dialog-md", "dialog-lg", "drawer", "drawer-lg"],
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
        "sidebar-rail",
        "topbar",
        "input",
        "table-head",
        "table-max",
        "dialog-h",
        "avatar-sm",
        "avatar-md",
        "avatar-lg",
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
