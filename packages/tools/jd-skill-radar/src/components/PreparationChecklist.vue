<script setup lang="ts">
import { LabButton } from "@kunlun/ui";
import type { DeepReadonly } from "vue";
import type { JdChecklistItem } from "../domain/types.ts";

defineProps<{
  items: readonly DeepReadonly<JdChecklistItem>[];
  checkedIds: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  toggle: [id: string];
  copy: [];
  download: [];
}>();

function toggle(id: string): void {
  emit("toggle", id);
}

function copy(): void {
  emit("copy");
}

function download(): void {
  emit("download");
}
</script>

<template>
  <section
    class="jd-module"
    aria-labelledby="jd-checklist-heading"
  >
    <h2 id="jd-checklist-heading">准备清单</h2>
    <label
      v-for="item in items"
      :key="item.id"
      class="jd-checklist-item"
    >
      <!-- prettier-ignore -->
      <input
        type="checkbox"
        :checked="checkedIds.has(item.id)"
        @change="toggle(item.id)"
      >
      <span>{{ item.label }}</span>
      <!-- prettier-ignore -->
      <a
        v-if="item.noteUrl !== undefined"
        :href="item.noteUrl"
      >查看知识库章节</a>
    </label>
    <div class="jd-export-actions">
      <LabButton
        class="jd-button--secondary"
        data-action="copy"
        @click="copy"
      >
        复制 Markdown
      </LabButton>
      <LabButton
        class="jd-button--secondary"
        data-action="download"
        @click="download"
      >
        下载 Markdown
      </LabButton>
    </div>
  </section>
</template>
