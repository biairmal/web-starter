"use client";

import { useState } from "react";
import { AsyncCombobox } from "@/components/ui/async-combobox";
import { Combobox } from "@/components/ui/combobox";
import {
  DatePicker,
  DateRangePicker,
  type IsoRange,
  MultiDatePicker,
} from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Text } from "@/components/ui/typography";
import { COUNTRIES, fakePeopleFetcher, resolvePeople } from "../fixtures";
import { Demo, Section } from "./section";

const people = fakePeopleFetcher();
const flakyPeople = fakePeopleFetcher(2);

function Value({ value }: { value: unknown }) {
  return (
    <Text variant="mono" className="text-muted-foreground">
      {JSON.stringify(value)}
    </Text>
  );
}

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full max-w-xs flex-col gap-stack-xs">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function Pickers() {
  const [country, setCountry] = useState<string | null>("indonesia");
  const [countries, setCountries] = useState<string[]>([
    "indonesia",
    "japan",
    "singapore",
  ]);
  const [owner, setOwner] = useState<string | null>("u_012");
  const [members, setMembers] = useState<string[]>([]);
  const [flaky, setFlaky] = useState<string | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [range, setRange] = useState<IsoRange | null>(null);
  const [dates, setDates] = useState<string[]>([]);

  return (
    <>
      <Section
        id="combobox"
        title="Combobox"
        source="src/components/ui/combobox.tsx"
      >
        <Demo label="Single">
          <Field id="cb-country" label="Country">
            <Combobox
              id="cb-country"
              options={COUNTRIES}
              value={country}
              onValueChange={setCountry}
            />
          </Field>
          <Value value={country} />
        </Demo>
        <Demo label="Multiple (chips, then +N)">
          <Field id="cb-countries" label="Regions">
            <Combobox
              id="cb-countries"
              multiple
              options={COUNTRIES}
              value={countries}
              onValueChange={setCountries}
            />
          </Field>
          <Value value={countries} />
        </Demo>
        <Demo label="Invalid and disabled">
          <Field id="cb-invalid" label="Country">
            <Combobox
              id="cb-invalid"
              aria-invalid
              options={COUNTRIES}
              value={null}
              onValueChange={() => undefined}
            />
          </Field>
          <Field id="cb-disabled" label="Country">
            <Combobox
              id="cb-disabled"
              disabled
              options={COUNTRIES}
              value="japan"
              onValueChange={() => undefined}
            />
          </Field>
        </Demo>
      </Section>

      <Section
        id="async-combobox"
        title="Async combobox"
        source="src/components/ui/async-combobox.tsx (fake fetcher: src/dev/fixtures.ts)"
      >
        <Demo label="Single, preselected (label resolved by id)">
          <Field id="acb-owner" label="Owner">
            <AsyncCombobox
              id="acb-owner"
              fetchOptions={people}
              resolveLabels={resolvePeople}
              value={owner}
              onValueChange={setOwner}
            />
          </Field>
          <Value value={owner} />
        </Demo>
        <Demo label="Multiple, 80 people in pages of 20">
          <Field id="acb-members" label="Members">
            <AsyncCombobox
              id="acb-members"
              multiple
              fetchOptions={people}
              resolveLabels={resolvePeople}
              value={members}
              onValueChange={setMembers}
            />
          </Field>
          <Value value={members} />
        </Demo>
        <Demo label="First load fails, then every other one (Retry)">
          <Field id="acb-flaky" label="Reviewer">
            <AsyncCombobox
              id="acb-flaky"
              fetchOptions={flakyPeople}
              value={flaky}
              onValueChange={setFlaky}
            />
          </Field>
        </Demo>
      </Section>

      <Section
        id="date-picker"
        title="Date pickers"
        source="src/components/ui/date-picker.tsx, calendar.tsx"
      >
        <Demo label="Single (ISO value)">
          <Field id="dp-due" label="Due date">
            <DatePicker id="dp-due" value={date} onValueChange={setDate} />
          </Field>
          <Value value={date} />
        </Demo>
        <Demo label="Range with presets">
          <Field id="dp-range" label="Created">
            <DateRangePicker
              id="dp-range"
              value={range}
              onValueChange={setRange}
            />
          </Field>
          <Value value={range} />
        </Demo>
        <Demo label="Multiple days">
          <Field id="dp-multi" label="Holidays">
            <MultiDatePicker
              id="dp-multi"
              value={dates}
              onValueChange={setDates}
            />
          </Field>
          <Value value={dates} />
        </Demo>
      </Section>
    </>
  );
}
