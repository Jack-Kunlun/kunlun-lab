#!/usr/bin/env pwsh
# Docker smoke test for Kunlun Lab
# 用法：从仓库根目录执行  pwsh -File tests/docker/smoke.ps1
# 环境变量 LAB_PORT 可覆盖宿主机端口（默认 3000）。

$ErrorActionPreference = "Stop"

$ComposeProject = "kunlun-lab-smoke"
$ComposeFile = Join-Path $PSScriptRoot "../../compose.yaml"
$ContainerName = "$ComposeProject-web-1"
$LabPort = if ($env:LAB_PORT) { $env:LAB_PORT } else { "3000" }

function Wait-Healthy {
  param([int]$TimeoutSeconds = 180)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $status = docker inspect --format "{{.State.Health.Status}}" $ContainerName 2>$null
    if ($status -eq "healthy") {
      return $true
    }
    if ($status -eq "unhealthy") {
      return $false
    }
    Start-Sleep -Seconds 3
  }

  return $false
}

try {
  docker compose -p $ComposeProject -f $ComposeFile up -d --build

  if (-not (Wait-Healthy)) {
    docker compose -p $ComposeProject -f $ComposeFile logs
    throw "web 服务未在超时时间内变为 healthy"
  }

  $base = "http://localhost:$LabPort"

  # 健康接口：HTTP 成功 + status=ok + 无额外字段
  $health = Invoke-RestMethod -Uri "$base/api/health" -Method Get
  if ($health.status -ne "ok") {
    throw "health 响应 status 不是 ok"
  }
  $keys = @($health.PSObject.Properties.Name)
  if ($keys.Count -ne 1 -or $keys[0] -ne "status") {
    throw "health 响应包含额外字段: $($keys -join ', ')"
  }

  # 首页可访问
  $home = Invoke-WebRequest -Uri "$base/" -Method Get
  if ($home.StatusCode -ne 200) {
    throw "首页返回状态码 $($home.StatusCode)"
  }

  # 容器有效 UID 不为 0
  $uid = (docker exec $ContainerName id -u).Trim()
  if ($uid -eq "0") {
    throw "容器以 root (UID 0) 运行"
  }

  Write-Host "smoke 通过：/api/health status=ok、首页=200、容器 UID=$uid"
}
finally {
  docker compose -p $ComposeProject -f $ComposeFile down 2>$null
}
