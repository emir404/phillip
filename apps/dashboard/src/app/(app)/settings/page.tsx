import { CopyButton } from "@/components/copy-button";
import { ApiKeyReveal, BillingForm, PersonaForm } from "@/components/settings-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_PERSONA,
  DEFAULT_PRICING,
  type PersonaSettings,
  type PricingSettings,
  getSetting,
} from "@/lib/store";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [pricing, persona, budgetCap, escalationEmail, h] = await Promise.all([
    getSetting<PricingSettings>("pricing", DEFAULT_PRICING),
    getSetting<PersonaSettings>("persona", DEFAULT_PERSONA),
    getSetting<number>("budgetCapUsd", Number(process.env.PHILLIP_BUDGET_CAP_USD ?? 5)),
    getSetting<string>("escalationEmail", "team@nutz.inc"),
    headers(),
  ]);

  const host = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost"}`;
  const apiKey = process.env.PHILLIP_API_KEY;
  const maskedKey = apiKey ? `${apiKey.slice(0, 6)}${"•".repeat(12)}` : null;

  const curlExample = [
    `curl -X POST ${host}/v1/previews \\`,
    `  -H "x-api-key: $PHILLIP_API_KEY" \\`,
    `  -H "content-type: application/json" \\`,
    `  -d '{"business":"Forge Barbers","industry":"barbershop",`,
    `       "siteUrl":"https://preview.example.com",`,
    `       "files":[{"path":"index.html","content":"<!doctype html>…"}]}'`,
  ].join("\n");

  const snippetTemplate = `<script src="${host}/phillip.js" data-preview-id="…" defer></script>`;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Pricing, guardrails, and the keys agents use to talk to Phillip.
        </p>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pricing &amp; guardrails</CardTitle>
            <CardDescription>
              What checkout charges, the per-lead LLM budget, and where escalations go.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BillingForm
              pricing={pricing}
              budgetCap={budgetCap}
              escalationEmail={escalationEmail}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Persona</CardTitle>
            <CardDescription>Who the chat widget claims to be on preview sites.</CardDescription>
          </CardHeader>
          <CardContent>
            <PersonaForm persona={persona} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>API access</CardTitle>
            <CardDescription>
              Server-to-server key for the build agents, plus the two calls they need.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                PHILLIP_API_KEY
              </p>
              <ApiKeyReveal masked={maskedKey} />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Register a preview
                </p>
                <CopyButton text={curlExample} size="xs" label="Copy" />
              </div>
              <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                {curlExample}
              </pre>
              <p className="text-xs text-muted-foreground">
                Returns the lead + preview ids and the exact embed snippet. Attach&nbsp;
                <code className="rounded bg-muted px-1 py-0.5">files</code> so iterations can run
                automatically.
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Embed snippet
                </p>
                <CopyButton text={snippetTemplate} size="xs" label="Copy" />
              </div>
              <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                {snippetTemplate}
              </pre>
              <p className="text-xs text-muted-foreground">
                Drop it into each preview site's&nbsp;
                <code className="rounded bg-muted px-1 py-0.5">&lt;head&gt;</code> with the preview
                id from the call above.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
