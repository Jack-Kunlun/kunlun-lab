// @vitest-environment happy-dom

import type { ToolManifest } from "@kunlun/shared";
import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import InternalToolRenderer from "../../components/InternalToolRenderer.client.vue";

type ComponentLoader = ToolManifest["component"];

const quote = String.fromCharCode(34);
const statusSelector = `[role=${quote}status${quote}]`;
const alertSelector = `[role=${quote}alert${quote}]`;
const retrySelector = `[data-test=${quote}retry${quote}]`;

function createManifest(id: string, component: ComponentLoader): ToolManifest {
  return {
    capabilities: [],
    component,
    id,
    runtime: "client",
    status: "alpha",
    title: `测试工具 ${id}`,
  };
}

function createLoadedComponent(text: string) {
  return defineComponent({
    name: `LoadedTool${text}`,
    render() {
      return h("p", { "data-tool-output": true }, text);
    },
  });
}

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

describe("InternalToolRenderer", () => {
  it("contains a rejected loader inside a safe error viewport", async () => {
    const rawError = "loader exploded with an internal stack marker";
    const manifest = createManifest("failing-tool", () => Promise.reject(new Error(rawError)));
    const wrapper = mount(InternalToolRenderer, { props: { manifest } });

    expect(wrapper.get(statusSelector).text()).toContain("工具正在加载");

    await flushPromises();

    const viewport = wrapper.get("[data-tool-viewport]");

    expect(viewport.get(alertSelector).text()).toContain("工具暂时无法运行");
    expect(viewport.find(retrySelector).exists()).toBe(true);
    expect(viewport.text()).not.toContain(rawError);
  });

  it("retries a failed loader and renders the recovered workbench", async () => {
    let attempts = 0;
    const recoveredText = "恢复后的工具工作台";
    const rawError = "private loader failure";
    const recoveredComponent = createLoadedComponent(recoveredText);
    const manifest = createManifest("retry-tool", () => {
      attempts += 1;

      if (attempts === 1) {
        return Promise.reject(new Error(rawError));
      }

      return Promise.resolve({ default: recoveredComponent });
    });
    const wrapper = mount(InternalToolRenderer, { props: { manifest } });

    await flushPromises();
    await wrapper.get(retrySelector).trigger("click");
    await flushPromises();

    expect(attempts).toBe(2);
    expect(wrapper.get("[data-tool-viewport]").text()).toContain(recoveredText);
    expect(wrapper.text()).not.toContain(rawError);
  });

  it("does not let an older manifest promise replace the latest workbench", async () => {
    const firstLoad = deferred<{ default: ReturnType<typeof createLoadedComponent> }>();
    const secondLoad = deferred<{ default: ReturnType<typeof createLoadedComponent> }>();
    const firstText = "旧工具工作台";
    const secondText = "新工具工作台";
    const firstManifest = createManifest("first-tool", () => firstLoad.promise);
    const secondManifest = createManifest("second-tool", () => secondLoad.promise);
    const wrapper = mount(InternalToolRenderer, { props: { manifest: firstManifest } });

    await nextTick();
    await wrapper.setProps({ manifest: secondManifest });
    await nextTick();

    secondLoad.resolve({ default: createLoadedComponent(secondText) });
    await flushPromises();
    expect(wrapper.get("[data-tool-viewport]").text()).toContain(secondText);

    firstLoad.resolve({ default: createLoadedComponent(firstText) });
    await flushPromises();

    expect(wrapper.get("[data-tool-viewport]").text()).toContain(secondText);
    expect(wrapper.get("[data-tool-viewport]").text()).not.toContain(firstText);
  });
});
