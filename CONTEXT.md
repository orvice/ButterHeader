# ButterHeader — Ubiquitous Language

## Terms

### Profile
一组独立的 header 修改配置单元。多个 Profile 可以**同时生效**；每个 Profile 有自己的启用/暂停开关、header 列表和 domain 匹配规则。

### Header 规则（Header Rule）
Profile 内的一条 header 修改指令。由四部分组成：**目标**（request / response）、**操作**（set / remove）、header 名、值（remove 时无值）。每条规则可单独启用/禁用。

### Redirect 规则（Redirect Rule）
Profile 内的一条重定向指令。由**源域名**和**目标**组成：命中源域名的请求被重定向到目标主机，保留原 path/query。源域名沿用 Domain 规则的匹配语义（`example.com` 精确、`*.example.com` 通配）；目标可写 `host`、`host:port` 或带协议 `http://localhost:3000`（可改 host / 端口 / 协议）。每条规则可单独启用/禁用，与 Header 规则平行。生效判定同样叠加全局暂停、Profile 启用、规则启用与源域名命中。

### Domain 规则（Domain Filter）
Profile 级的白名单，决定该 Profile 对哪些站点生效。匹配的是**请求的目标域名**（request domain），而非发起请求的页面域名——在 A 站页面上发往 B 站的请求，按 B 站判定。`example.com` 精确匹配该域名；`*.example.com` 匹配其所有子域。**空列表 = 对所有网站生效**。无排除列表。

### 配置仓库（Config Store）
各界面（Options、Popup、后台）读取和修改配置的唯一入口。每个界面通过它看到同一份配置状态；修改立即反映在界面上，随后持久化并同步到其他界面。当本地未保存的编辑与外部变更（其他界面或其他设备）相遇时，**未保存的本地编辑优先**（按 Profile 逐个判定）。保存失败（如超出配额）是配置状态的一部分，会连同出错的 Profile 一起呈现给用户，不会静默丢失编辑内容。

### 全局暂停（Global Pause）
一键停用整个扩展的开关。它不改写任何 Profile 或规则的状态，只是叠加一层判断。恢复后一切按原状态生效。

生效判定：`规则生效 = !全局暂停 && Profile 启用 && 规则启用 && Domain 命中`。

### Popup
点击扩展图标弹出的快捷面板。只承载高频操作：全局暂停、各 Profile 的启用/暂停开关、跳转到编辑页。

### Options 页
全屏配置页。承载低频编辑操作：Profile 的增删改、Header 规则编辑、Domain 列表编辑、导入/导出。

### 导入 / 导出（Import / Export）
配置的 JSON 备份与分享机制，带 `version` 字段。两种粒度：全量配置、单个 Profile。导入一律**追加合并**（不覆盖现有 Profile）。

### 冲突覆盖（Override by Order）
当一个请求同时命中多个已启用 Profile，且它们设置了同名 header 时，按 Profile 列表顺序**后者覆盖前者**（层叠语义）。顺序即 Options 页列表顺序，用户可拖拽调整。
