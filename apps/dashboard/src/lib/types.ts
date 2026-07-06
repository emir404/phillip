import type { AnalyticsEvent, Conversation, Lead, Order, Preview, Session } from "@nutz/phillip";

// A composite of the shared records the way the team reads a single lead: the
// lead + its preview + session context + the engagement score, its event
// stream, and (once they talk) the conversation. This is exactly the shape the
// backend assembles from the records the embed/agents write.
export interface DashboardLead {
  lead: Lead;
  preview: Preview;
  session: Session;
  engagementScore: number;
  events: AnalyticsEvent[];
  conversation?: Conversation;
  order?: Order;
}
