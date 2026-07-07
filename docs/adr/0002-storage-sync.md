# 0002. 配置存储在 chrome.storage.sync

## 状态

已接受（2026-07-07）

## 背景

配置需要持久化。可选 `chrome.storage.local`（仅本机、无配额压力）或 `chrome.storage.sync`（随 Chrome 账号跨设备同步，但有配额：单 key 8KB、总量 100KB、写入频率限制）。

## 决策

使用 `chrome.storage.sync`，跨设备同步是产品需求。

## 取舍与后果

- ✅ 换机器/多机器场景开箱即用。
- ❌ 配额约束数据布局：**每个 Profile 存为独立 key**（避免单 key 8KB 上限），并需在 UI 层对超限写入给出明确错误。
- ❌ header 值（可能含 token 等敏感信息）会同步到用户 Google 账号。已知情接受。
- ❌ 写入需节流（`MAX_WRITE_OPERATIONS_PER_MINUTE` 限制），编辑时防抖保存。

## 备选方案

- local + 手动导入/导出：更私密但换机体验差，被否。
