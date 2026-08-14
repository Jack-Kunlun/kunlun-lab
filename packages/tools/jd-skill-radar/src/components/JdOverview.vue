<script setup lang="ts">
import { MetricCell } from "@kunlun/ui";
import { computed } from "vue";
import type { DeepReadonly } from "vue";
import type { JdOverview } from "../domain/types.ts";

const props = defineProps<{ overview: DeepReadonly<JdOverview> }>();
const show = (value: string): string => (value.length === 0 ? "未识别" : value);
const primaryFrameworks = computed(() =>
  props.overview.primaryFrameworks.length > 0
    ? props.overview.primaryFrameworks.join("、")
    : "未识别",
);
</script>

<template>
  <section
    class="jd-module"
    aria-labelledby="jd-overview-heading"
  >
    <h2 id="jd-overview-heading">岗位概览</h2>
    <div class="jd-overview-grid">
      <MetricCell
        label="岗位线索"
        :value="show(props.overview.role)"
      />
      <MetricCell
        label="经验要求"
        :value="show(props.overview.experience)"
      />
      <MetricCell
        label="学历要求"
        :value="show(props.overview.education)"
      />
      <MetricCell
        label="地点 / 工作方式"
        :value="show(props.overview.location)"
      />
      <MetricCell
        label="主要框架"
        :value="primaryFrameworks"
      />
    </div>
  </section>
</template>
