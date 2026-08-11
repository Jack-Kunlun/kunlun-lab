---
title: 构建个人主页与产品实验室
description: 记录 Personal Lab 首版的定位、技术边界与搭建过程。
publishedAt: 2026-08-10
updatedAt: 2026-08-11
tags:
  - Nuxt
  - 产品实验室
featured: true
draft: false
---

# 构建个人主页与产品实验室

Personal Lab 的首版目标不是搭建一个功能繁杂的平台，而是建立清晰的个人主页、作品入口和
技术实践记录。

当前构建采用 pnpm workspace 与 Turborepo 管理 Nuxt 主站和多个职责明确的 package。内容
由 Nuxt Content 管理，交互工具以 workspace package 的形式接入主站。

首版会保持四项主导航，先完成真实内容、统一工具协议和浏览器本地运行的前端岗位 JD 技能
雷达。登录、支付、评论、AI 分析和内容后台都不在这次构建范围内。

这是一篇持续更新的构建记录。后续内容只记录已经完成或正在验证的工作，不使用未经核实的
用户反馈填充结果。
