<script setup lang="ts">
import { LabButton } from "@kunlun/ui";
import { computed } from "vue";
import { MAX_JD_LENGTH } from "../domain/index.ts";
import type { JdRadarFeedback, JdRadarStatus } from "../state/types.ts";

const props = defineProps<{
  input: string;
  status: JdRadarStatus;
  feedback: JdRadarFeedback | null;
}>();

const emit = defineEmits<{
  "update:input": [value: string];
  analyze: [];
  retry: [];
  reset: [];
}>();

const displayMessage = computed(() => {
  if (props.feedback?.code === "NO_SKILLS") {
    return "未识别到前端技能关键词，请确认内容是否为完整的前端岗位 JD。";
  }

  return props.feedback?.message ?? (props.status === "analyzing" ? "正在分析" : "");
});
const characterCountLabel = computed(
  () => `${props.input.length.toLocaleString("zh-CN")} / ${MAX_JD_LENGTH.toLocaleString("zh-CN")}`,
);
const isAnalyzing = computed(() => props.status === "analyzing");
const isFailed = computed(() => props.status === "failed");
const isInvalid = computed(() => props.status === "invalid");
const canReset = computed(() => props.input.length > 0 || props.status !== "idle");

function handleInput(event: Event): void {
  if (event.currentTarget instanceof HTMLTextAreaElement) {
    emit("update:input", event.currentTarget.value);
  }
}

function requestAnalyze(): void {
  emit("analyze");
}

function requestRetry(): void {
  emit("retry");
}

function requestReset(): void {
  emit("reset");
}
</script>

<template>
  <section
    class="jd-input-panel"
    aria-labelledby="jd-input-heading"
  >
    <div class="jd-input-panel__heading">
      <h2 id="jd-input-heading">粘贴招聘 JD</h2>
      <span>{{ characterCountLabel }}</span>
    </div>
    <label for="jd-radar-input">招聘 JD 纯文本</label>
    <textarea
      id="jd-radar-input"
      :aria-invalid="isInvalid"
      aria-describedby="jd-radar-feedback"
      :value="input"
      @input="handleInput"
    />
    <p
      id="jd-radar-feedback"
      aria-live="polite"
      :data-kind="feedback?.kind"
    >
      {{ displayMessage }}
    </p>
    <div class="jd-input-panel__actions">
      <LabButton
        data-action="analyze"
        :disabled="isAnalyzing"
        @click="requestAnalyze"
      >
        {{ isAnalyzing ? "正在分析" : "开始分析" }}
      </LabButton>
      <LabButton
        v-if="isFailed"
        data-action="retry"
        @click="requestRetry"
      >
        重试分析
      </LabButton>
      <LabButton
        v-if="canReset"
        class="jd-button--secondary"
        data-action="reset"
        @click="requestReset"
      >
        清空重置
      </LabButton>
    </div>
    <p class="jd-input-panel__privacy">
      JD 不上传、不记录，默认不跨会话保存；Markdown 在本地生成。
    </p>
  </section>
</template>
