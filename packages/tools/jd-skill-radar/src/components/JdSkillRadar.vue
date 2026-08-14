<script setup lang="ts">
import { StatusBadge } from "@kunlun/ui";
import { computed } from "vue";
import type { DeepReadonly } from "vue";
import type { JdAnalysis } from "../domain/types.ts";
import type { UseJdRadarOptions } from "../state/types.ts";
import { useJdRadar } from "../state/useJdRadar.ts";
import JdInputPanel from "./JdInputPanel.vue";
import JdOverview from "./JdOverview.vue";
import KeywordDetails from "./KeywordDetails.vue";
import PreparationChecklist from "./PreparationChecklist.vue";
import SkillDistribution from "./SkillDistribution.vue";

const props = defineProps<{ options?: UseJdRadarOptions }>();
const controller = useJdRadar(props.options);
const visibleAnalysis = computed<DeepReadonly<JdAnalysis> | null>(() => {
  if (controller.status.value !== "ready" && controller.status.value !== "stale") {
    return null;
  }

  return controller.analysis.value;
});
const isStale = computed(() => controller.status.value === "stale");

async function analyze(): Promise<void> {
  await controller.analyze();
}

async function retry(): Promise<void> {
  await controller.retry();
}

async function copy(): Promise<void> {
  await controller.copyMarkdown();
}

async function download(): Promise<void> {
  await controller.downloadMarkdown();
}
</script>

<template>
  <section
    class="jd-radar"
    aria-labelledby="jd-radar-title"
    :class="`jd-radar--${controller.status.value}`"
  >
    <header class="jd-radar__header">
      <div>
        <p class="jd-radar__eyebrow">WORKBENCH / JD-SKILL-RADAR</p>
        <h1 id="jd-radar-title">前端岗位 JD 技能雷达</h1>
        <p>把招聘文本整理为技能信号、语气强度与可执行的准备清单。</p>
      </div>
      <StatusBadge
        label="CLIENT_ONLY · ALPHA"
        tone="experiment"
      />
    </header>

    <div class="jd-radar__workspace">
      <JdInputPanel
        :feedback="controller.feedback.value"
        :input="controller.input.value"
        :status="controller.status.value"
        @analyze="analyze"
        @reset="controller.reset"
        @retry="retry"
        @update:input="controller.setInput"
      />

      <section
        v-if="visibleAnalysis"
        class="jd-radar__results"
        data-results="true"
      >
        <p
          v-if="isStale"
          data-status="stale"
        >
          输入已修改，当前结果已过期。重新分析后会替换旧结果。
        </p>
        <JdOverview :overview="visibleAnalysis.overview" />
        <SkillDistribution :categories="visibleAnalysis.categories" />
        <KeywordDetails :keywords="visibleAnalysis.keywords" />
        <PreparationChecklist
          :checked-ids="controller.checkedIds.value"
          :items="visibleAnalysis.checklist"
          @copy="copy"
          @download="download"
          @toggle="controller.toggleChecklist"
        />
      </section>
    </div>

    <footer class="jd-radar__disclaimer">
      技能分值只表示当前 JD 文本的强调程度，不代表岗位质量、个人能力或面试结果。
    </footer>
  </section>
</template>

<style src="../styles.css"></style>
