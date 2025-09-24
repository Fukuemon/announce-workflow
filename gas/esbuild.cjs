const esbuild = require("esbuild");
const { GasPlugin } = require("esbuild-gas-plugin");

const common = {
  bundle: true,
  minify: false,
  sourcemap: false,
  target: ["es2019"],
  format: "iife",
  platform: "neutral",
  plugins: [GasPlugin],
};

async function build() {
  try {
    await esbuild.build({
      ...common,
      entryPoints: ["./src/main.ts"],
      outfile: "./dist/main.js",
      banner: {
        js:
          'function onMessage(e){return globalThis.onMessage?globalThis.onMessage(e):{text:"handler not found"}}\n' +
          'function onCardClick(e){return globalThis.onCardClick?globalThis.onCardClick(e):{text:"handler not found"}}\n' +
          'function onAddToSpace(e){return globalThis.onAddToSpace?globalThis.onAddToSpace(e):{text:"added"}}\n' +
          "function onRemoveFromSpace(e){if(globalThis.onRemoveFromSpace)globalThis.onRemoveFromSpace(e)}\n" +
          "function onFormSubmit(e){if(globalThis.onFormSubmit)return globalThis.onFormSubmit(e)}\n" +
          "function manualTestWorkflow(){if(globalThis.manualTestWorkflow)return globalThis.manualTestWorkflow()}\n" +
          // Chat App button handlers
          "function approve_post(e){return globalThis.chatHandler_approve_post?globalThis.chatHandler_approve_post(e):{text:'approve_post handler not found'}}\n" +
          "function reject_post(e){return globalThis.chatHandler_reject_post?globalThis.chatHandler_reject_post(e):{text:'reject_post handler not found'}}\n" +
          // setupProperties (no-arg wrappers)
          "function setupScriptProperties(){if(globalThis.setupScriptProperties)return globalThis.setupScriptProperties()}\n" +
          "function showCurrentProperties(){if(globalThis.showCurrentProperties)return globalThis.showCurrentProperties()}\n" +
          "function clearScriptProperties(){if(globalThis.clearScriptProperties)return globalThis.clearScriptProperties()}\n",
      },
    });
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

build();
