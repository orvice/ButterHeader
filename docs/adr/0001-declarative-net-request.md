# 0001. 使用 MV3 declarativeNetRequest 动态规则实现 header 修改

## 状态

已接受（2026-07-07）

## 背景

Chrome Web Store 已不再接受 Manifest V2 扩展；MV3 下 blocking `webRequest` 仅对企业策略部署可用。header 修改只剩两条路：declarativeNetRequest（DNR），或放弃普通用户分发渠道。

## 决策

使用 DNR 的 **dynamic rules**（`chrome.declarativeNetRequest.updateDynamicRules`）。任何配置变更（Profile 增删改、开关、全局暂停）时，由 service worker 从存储的配置**全量重算**规则集并原子替换。

## 取舍与后果

- ✅ 规则由浏览器引擎执行，service worker 休眠也不影响生效；性能好、无竞态。
- ✅ 动态规则上限 5000 条，远超本扩展需求。
- ❌ header 值是静态字符串，**无法按请求动态计算**（时间戳、签名等场景不支持）。已知情接受。
- ❌ 无法逐请求观测"实际改了什么"（DNR 不回调）；调试反馈只能靠 `getMatchedRules`（需 declarativeNetRequestFeedback 权限，仅 dev 场景）。

## 备选方案

- blocking `webRequest`：MV3 普通分发不可用，排除。
- MV2：商店已拒收，排除。
