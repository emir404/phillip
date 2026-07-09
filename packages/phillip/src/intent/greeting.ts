/** The one opening line Phillip ever says — shared by the server (persisted at
 *  boot) and the widget (offline/mock fallback) so the copy can't drift. */
export function defaultGreeting(name: string, business: string): string {
  return `hey, i'm ${name.toLowerCase()}. i built this one for ${business}. honest take — what do you think?`;
}
