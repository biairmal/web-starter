import { Breadcrumb } from "@/components/layout/breadcrumb";
import { FormActions } from "@/components/layout/form-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/typography";
import { Demo, Section } from "./section";

export function Layout() {
  return (
    <>
      <Section
        id="page-header"
        title="Page header"
        source="src/components/layout/page-header.tsx"
      >
        <Text variant="secondary">
          The header of this page is a PageHeader. An edit screen passes
          breadcrumb, status and sticky, with Cancel and Save as the action: see
          any role at /admin/roles.
        </Text>
      </Section>

      <Section
        id="breadcrumb"
        title="Breadcrumb"
        source="src/components/layout/breadcrumb.tsx"
      >
        <Demo label="Two and three levels">
          <Breadcrumb
            label="Breadcrumb, two levels"
            items={[
              { label: "Roles", href: "#breadcrumb" },
              { label: "Editor" },
            ]}
          />
          <Breadcrumb
            label="Breadcrumb, three levels"
            items={[
              { label: "Admin", href: "#breadcrumb" },
              { label: "Users", href: "#breadcrumb" },
              { label: "Dina Pratama" },
            ]}
          />
        </Demo>
      </Section>

      <Section id="card" title="Card" source="src/components/ui/card.tsx">
        <div className="grid gap-stack-lg md:grid-cols-2">
          <Card title="Details" description="A card names its region.">
            <Text>Content sits inside the card padding (--card-pad).</Text>
          </Card>
          <Card
            title="Permissions"
            action={
              <Input
                type="search"
                aria-label="Search permissions"
                placeholder="Search"
                className="w-full sm:w-48"
              />
            }
          >
            <Text variant="secondary">
              A card action sits at the end of its title row.
            </Text>
          </Card>
        </div>
      </Section>

      <Section
        id="form-actions"
        title="Form actions"
        source="src/components/layout/form-actions.tsx"
      >
        <FormActions>
          <Button variant="outline">Cancel</Button>
          <Button>Save</Button>
        </FormActions>
      </Section>
    </>
  );
}
