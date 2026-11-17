"use client";

import { AlignCenter, AlignLeft, AlignRight, Search } from "lucide-react";
import { useState } from "react";
import {
  Field,
  FieldCounter,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { InputGroup } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Demo, Section } from "./section";

const BIO_MAX = 80;

export function Inputs() {
  const [bio, setBio] = useState("Builds the billing service.");
  const [range, setRange] = useState([20, 80]);
  return (
    <>
      <Section
        id="input-group"
        title="Input group"
        source="src/components/ui/input-group.tsx"
      >
        <div className="grid gap-stack-lg sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="g-search">Search</FieldLabel>
            <InputGroup
              id="g-search"
              type="search"
              placeholder="Name or email"
              prefix={<Search />}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="g-search-busy">Search, loading</FieldLabel>
            <InputGroup
              id="g-search-busy"
              type="search"
              defaultValue="dina"
              prefix={<Search />}
              loading
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="g-site">Prefix text</FieldLabel>
            <InputGroup id="g-site" prefix="@" defaultValue="acme" />
          </Field>
        </div>
      </Section>

      <Section
        id="textarea"
        title="Textarea and counter"
        source="src/components/ui/textarea.tsx, field.tsx"
      >
        <div className="grid gap-stack-lg sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="g-bio">Bio</FieldLabel>
            <Textarea
              id="g-bio"
              value={bio}
              aria-describedby="g-bio-counter"
              onChange={(event) => {
                setBio(event.target.value);
              }}
            />
            <FieldCounter id="g-bio-counter" length={bio.length} max={BIO_MAX}>
              {`${String(bio.length)} / ${String(BIO_MAX)}`}
            </FieldCounter>
          </Field>
          <Field data-invalid>
            <FieldLabel htmlFor="g-bio-invalid">Invalid</FieldLabel>
            <Textarea
              id="g-bio-invalid"
              aria-invalid
              aria-describedby="g-bio-invalid-error"
              defaultValue=""
            />
            <FieldError id="g-bio-invalid-error">Enter a reason.</FieldError>
          </Field>
          <Field data-disabled>
            <FieldLabel htmlFor="g-bio-disabled">Disabled</FieldLabel>
            <Textarea id="g-bio-disabled" disabled defaultValue="Locked" />
          </Field>
          <Field>
            <FieldLabel htmlFor="g-bio-readonly">Read only</FieldLabel>
            <Textarea
              id="g-bio-readonly"
              readOnly
              defaultValue="Created by the system."
            />
          </Field>
        </div>
      </Section>

      <Section
        id="number"
        title="Number input"
        source="src/components/ui/number-input.tsx"
      >
        <div className="grid gap-stack-lg sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor="g-seats">Seats</FieldLabel>
            <NumberInput id="g-seats" defaultValue={12} min={1} />
          </Field>
          <Field>
            <FieldLabel htmlFor="g-limit">With unit</FieldLabel>
            <NumberInput id="g-limit" defaultValue={50} unit="GB" />
            <FieldDescription>Storage per tenant.</FieldDescription>
          </Field>
          <Field data-disabled>
            <FieldLabel htmlFor="g-seats-off">Disabled</FieldLabel>
            <NumberInput id="g-seats-off" defaultValue={3} disabled />
          </Field>
        </div>
      </Section>

      <Section
        id="radio"
        title="Radio group"
        source="src/components/ui/radio-group.tsx"
      >
        <Demo label="Default, one disabled">
          <RadioGroup defaultValue="weekly" aria-label="Digest frequency">
            {(
              [
                ["daily", "Daily", false],
                ["weekly", "Weekly", false],
                ["never", "Never (managed by your admin)", true],
              ] as const
            ).map(([value, label, disabled]) => (
              <div key={value} className="flex items-center gap-inline-sm">
                <RadioGroupItem
                  id={`g-radio-${value}`}
                  value={value}
                  disabled={disabled}
                />
                <Label htmlFor={`g-radio-${value}`}>{label}</Label>
              </div>
            ))}
          </RadioGroup>
        </Demo>
      </Section>

      <Section id="switch" title="Switch" source="src/components/ui/switch.tsx">
        <Demo label="Off, on, disabled">
          {(
            [
              ["g-sw-1", false, false, "Email alerts"],
              ["g-sw-2", true, false, "Two-step sign in"],
              ["g-sw-3", true, true, "Audit log (always on)"],
            ] as const
          ).map(([id, checked, disabled, label]) => (
            <div key={id} className="flex items-center gap-inline-sm">
              <Switch id={id} defaultChecked={checked} disabled={disabled} />
              <Label htmlFor={id}>{label}</Label>
            </div>
          ))}
        </Demo>
      </Section>

      <Section id="slider" title="Slider" source="src/components/ui/slider.tsx">
        <div className="grid gap-stack-lg sm:grid-cols-2">
          <Demo label="Single">
            <Slider defaultValue={[40]} thumbLabels={["Volume"]} />
          </Demo>
          <Demo label={`Range: ${String(range[0])} to ${String(range[1])}`}>
            <Slider
              value={range}
              onValueChange={setRange}
              thumbLabels={["Minimum", "Maximum"]}
            />
          </Demo>
        </div>
      </Section>

      <Section
        id="toggle-group"
        title="Toggle group"
        source="src/components/ui/toggle-group.tsx"
      >
        <Demo label="Single, multiple, icons">
          <ToggleGroup type="single" defaultValue="list" aria-label="View">
            <ToggleGroupItem value="list">List</ToggleGroupItem>
            <ToggleGroupItem value="board">Board</ToggleGroupItem>
            <ToggleGroupItem value="calendar" disabled>
              Calendar
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup
            type="multiple"
            defaultValue={["active"]}
            aria-label="Status"
          >
            <ToggleGroupItem value="active">Active</ToggleGroupItem>
            <ToggleGroupItem value="invited">Invited</ToggleGroupItem>
            <ToggleGroupItem value="disabled">Disabled</ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup type="single" defaultValue="left" aria-label="Align">
            <ToggleGroupItem value="left" aria-label="Align left">
              <AlignLeft />
            </ToggleGroupItem>
            <ToggleGroupItem value="center" aria-label="Align centre">
              <AlignCenter />
            </ToggleGroupItem>
            <ToggleGroupItem value="right" aria-label="Align right">
              <AlignRight />
            </ToggleGroupItem>
          </ToggleGroup>
        </Demo>
      </Section>
    </>
  );
}
