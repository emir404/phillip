import { Phillip } from "@nutz/phillip";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { worker } from "../mock/browser";
import { FakeGeneratedSite } from "./FakeGeneratedSite";

async function start() {
  // Stand up the mock backend before the embed boots.
  await worker.start({ onUnhandledRequest: "bypass", quiet: true });

  const el = document.getElementById("root");
  if (!el) throw new Error("missing #root");

  createRoot(el).render(
    <StrictMode>
      <FakeGeneratedSite />
      <Phillip previewId="prv_demo" apiBase="" debug />
    </StrictMode>,
  );
}

void start();
