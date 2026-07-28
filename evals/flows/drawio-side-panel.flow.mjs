import { loadVoiceoverParagraphs } from "../runner/voiceover.mjs";

const vo = await loadVoiceoverParagraphs("drawio-side-panel");
const DRAWIO_TRIGGER = '[data-testid="drawio-panel-trigger"]';

export default {
  id: "drawio-side-panel",
  title: "Draw.io opens and resumes inside the OpenWork side panel",
  kind: "user-facing",
  spec: "evals/voiceovers/drawio-side-panel.md",
  steps: [
    {
      name: "OpenWork exposes the Draw.io side-panel entry",
      run: async (ctx) => {
        await ctx.waitFor("Boolean(window.__openworkControl)", {
          timeoutMs: 30_000,
          label: "window.__openworkControl",
        });
        await ctx.prove("Draw.io is available from the right tool rail", {
          voiceover: vo[0],
          assert: async () => {
            await ctx.waitFor(`Boolean(document.querySelector(${JSON.stringify(DRAWIO_TRIGGER)}))`, {
              label: "Draw.io panel trigger",
            });
          },
          screenshot: {
            name: "drawio-tool-rail-entry",
          },
        });
      },
    },
    {
      name: "Draw.io opens in the side panel without replacing chat",
      run: async (ctx) => {
        await ctx.prove("The production Draw.io action opens the embedded editor", {
          voiceover: vo[1],
          action: async () => {
            await ctx.waitFor(
              "window.__openworkControl.listActions().some((action) => action.id === 'drawio.panel.open' && !action.disabled)",
              { timeoutMs: 30_000, label: "drawio.panel.open control action" },
            );
            const result = await ctx.control("drawio.panel.open", {});
            ctx.assert(
              result?.action === "created" || result?.action === "focused",
              `Expected Draw.io tab to open or focus, got ${JSON.stringify(result)}`,
            );
          },
          assert: async () => {
            await ctx.waitFor(
              `document.querySelector(${JSON.stringify(DRAWIO_TRIGGER)})?.getAttribute("aria-pressed") === "true"`,
              { label: "active Draw.io tool rail entry" },
            );
            await ctx.expectHashIncludes("/session/");
          },
          screenshot: {
            name: "drawio-editor-side-panel",
          },
        });
      },
    },
  ],
};
