const assert = require("node:assert/strict");
const fs = require("node:fs");

const endpoint = process.env.LEGAL_PREVIEW_CDP_URL || "http://127.0.0.1:9333";
const previewOrigin = process.env.LEGAL_PREVIEW_ORIGIN || "http://127.0.0.1:4877";
const screenshotDirectory = process.env.LEGAL_SCREENSHOT_DIRECTORY;

void (async () => {
  const pages = await (await fetch(`${endpoint}/json`)).json();
  const page = pages.find((item) => item.type === "page" && item.url.startsWith(previewOrigin));
  assert.ok(page, `Abra ${previewOrigin}/legal/privacy em um Chrome com remote debugging.`);
  const client = await cdpClient(page.webSocketDebuggerUrl);

  const inspectTheme = async (theme) => {
    await client.evaluate(`localStorage.setItem('@kindle/appTheme', ${JSON.stringify(theme)}); location.href = ${JSON.stringify(`${previewOrigin}/legal/privacy`)}`);
    await wait(1600);
    const state = await client.evaluate(`(() => {
      const nodes = [...document.querySelectorAll('*')];
      const scroll = nodes.find((element) => element.scrollHeight > element.clientHeight + 100 && ['auto', 'scroll'].includes(getComputedStyle(element).overflowY));
      const before = scroll?.scrollTop ?? -1;
      if (scroll) scroll.scrollTop = scroll.scrollHeight;
      const surface = nodes.find((element) => getComputedStyle(element).backgroundColor !== 'rgba(0, 0, 0, 0)');
      return {
        heading: document.body.innerText.includes('Política de Privacidade'),
        background: getComputedStyle(surface || document.body).backgroundColor,
        scrollFound: Boolean(scroll),
        before,
        after: scroll?.scrollTop ?? -1,
        maximum: scroll ? scroll.scrollHeight - scroll.clientHeight : -1,
      };
    })()`);
    assert.ok(state.heading, `conteúdo de Privacidade ausente no tema ${theme}`);
    assert.ok(state.scrollFound && state.after > state.before && state.after > 0, `rolagem longa não funcionou no tema ${theme}`);
    if (screenshotDirectory) {
      const png = await client.command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      fs.mkdirSync(screenshotDirectory, { recursive: true });
      fs.writeFileSync(`${screenshotDirectory}/legal-${theme}.png`, Buffer.from(png.data, "base64"));
    }
    return state;
  };

  const light = await inspectTheme("light");
  const dark = await inspectTheme("dark");
  assert.notEqual(light.background, dark.background, "temas claro e escuro devem produzir fundos diferentes");

  await client.evaluate(`document.querySelector('[aria-label="Voltar"]')?.click()`);
  await wait(500);
  const returnedTo = await client.evaluate("location.pathname");
  assert.notEqual(returnedTo, "/legal/privacy", "o botão Voltar deve sair do documento");
  client.close();
  console.log(`Legal browser PASS: claro=${light.background}, escuro=${dark.background}, rolagem=${dark.after}/${dark.maximum}, retorno=${returnedTo}.`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function cdpClient(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  return {
    command,
    evaluate: async (expression) => {
      const result = await command("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Falha ao avaliar a página.");
      return result.result.value;
    },
    close: () => socket.close(),
  };
}

function wait(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
