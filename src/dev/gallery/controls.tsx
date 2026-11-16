"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { PasswordInput } from "@/components/forms/password-input";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Demo, Section } from "./section";

const VARIANTS = [
  "default",
  "outline",
  "secondary",
  "ghost",
  "destructive",
  "link",
] as const;
const SIZES = ["xs", "sm", "default", "lg"] as const;

export function Controls() {
  const [pending, setPending] = useState(false);
  return (
    <>
      <Section id="button" title="Button" source="src/components/ui/button.tsx">
        <Demo label="Variants">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </Demo>
        <Demo label="Sizes (--button-h-*)">
          {SIZES.map((size) => (
            <Button key={size} size={size} variant="outline">
              {size}
            </Button>
          ))}
        </Demo>
        <Demo label="With icon, icon only, disabled">
          <Button>
            <Plus data-icon="inline-start" />
            Invite user
          </Button>
          <Button variant="outline" size="icon" aria-label="Delete">
            <Trash2 />
          </Button>
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>
            Disabled
          </Button>
        </Demo>
        <Demo label="Pending (SubmitButton)">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPending(true);
              setTimeout(() => {
                setPending(false);
              }, 1500);
            }}
          >
            <SubmitButton pending={pending}>Save changes</SubmitButton>
          </form>
        </Demo>
      </Section>

      <Section
        id="input"
        title="Input and field"
        source="src/components/ui/input.tsx, field.tsx"
      >
        <div className="grid gap-stack-lg sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="g-default">Default</FieldLabel>
            <Input id="g-default" placeholder="Placeholder" />
            <FieldDescription>
              Helper text sits under the field.
            </FieldDescription>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="g-invalid">Invalid</FieldLabel>
            <Input
              id="g-invalid"
              aria-invalid
              defaultValue="not-an-email"
              aria-describedby="g-invalid-error"
            />
            <FieldError id="g-invalid-error">
              Enter a valid email address.
            </FieldError>
          </Field>
          <Field data-disabled>
            <FieldLabel htmlFor="g-disabled">Disabled</FieldLabel>
            <Input id="g-disabled" disabled defaultValue="Cannot edit" />
          </Field>
          <Field>
            <FieldLabel htmlFor="g-readonly">Read only</FieldLabel>
            <Input id="g-readonly" readOnly defaultValue="a3f9-41c2-8e17" />
          </Field>
          <Field>
            <FieldLabel htmlFor="g-password">Password</FieldLabel>
            <PasswordInput id="g-password" defaultValue="correct horse" />
          </Field>
          <Field>
            <FieldLabel htmlFor="g-select">Select</FieldLabel>
            <Select defaultValue="active">
              <SelectTrigger id="g-select" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="invited">Invited</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      <Section
        id="checkbox"
        title="Checkbox"
        source="src/components/ui/checkbox.tsx"
      >
        <Demo label="Unchecked, checked, disabled">
          {(
            [
              ["g-cb-1", false, false, "Email me"],
              ["g-cb-2", true, false, "Remember me"],
              ["g-cb-3", true, true, "Locked"],
            ] as const
          ).map(([id, checked, disabled, label]) => (
            <div key={id} className="flex items-center gap-inline-sm">
              <Checkbox id={id} defaultChecked={checked} disabled={disabled} />
              <Label htmlFor={id}>{label}</Label>
            </div>
          ))}
        </Demo>
      </Section>
    </>
  );
}
