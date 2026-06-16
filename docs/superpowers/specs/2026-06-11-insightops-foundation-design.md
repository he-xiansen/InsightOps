# InsightOps 主机监控应用一期设计方案

## 1. 背景与目标

### 1.1 项目背景

当前仓库主要承载 `Zabbix 6` 的容器化部署与运维文档，尚未形成独立的 InsightOps 业务应用。为满足主机监控、RDP 登录行为分析、闲置资源识别与内网部署的要求，需要在现有基础上新增一套自有的前后端应用与业务数据库。

### 1.2 一期范围

本次一期设计聚焦“后端数据底座”，目标如下：

- 基于 `Python + FastAPI` 构建 InsightOps 后端服务。
- 以配置文件方式对接现有内网 `Zabbix` 数据库，按只读方式拉取常用监控基础数据。
- 新增独立 `MySQL` 业务数据库，存储虚机基础信息、RDP 登录明细、闲置分析结果与任务执行记录。
- 以 `Windows` 安全日志中的 `Event ID 4624` 为一期 RDP 登录数据来源，并结合 `Logon Type = 10` 判定远程桌面登录。
- 提供以 `IP` 为唯一标识的虚机基础信息管理能力与标准化 `RESTful API`。
- 为后续前端可视化看板、RDP 登录趋势图与闲置资源分析提供稳定数据接口与数据模型基础。

### 1.3 一期范围外事项

以下内容在本次设计中保留接口与扩展位，但不作为一期必须完成项：

- 域控日志接入。
- 多种 RDP 采集器并存。
- CPU、内存、磁盘活跃度参与闲置判定主逻辑。
- 完整的前端业务页面与高保真视觉打磨。

## 2. 关键约束

- **总体架构：** 采用“`API Service + Collector Service + Project MySQL`”的分离式结构。
- **Zabbix 边界：** InsightOps 只读访问现有 `Zabbix MySQL`，不写入任何自定义业务数据。
- **业务数据库：** 使用独立 `MySQL` 库承载 InsightOps 自有表结构。
- **唯一标识：** 业务层统一以 `IP` 作为虚机唯一标识。
- **RDP 数据来源：** 一期优先接入 `Windows` 安全日志。
- **接口鉴权：** 外部系统同步接口采用 `API Key` 鉴权。
- **闲置判定阈值：** 默认按连续 `30` 天未发生 RDP 登录进行候选闲置识别。
- **技术栈要求：** 开发与部署基于 `Python`、`FastAPI`、`Docker`、`conda`。

## 3. 总体架构设计

### 3.1 架构概览

一期采用如下逻辑结构：

1. `api-service`
   - 提供虚机基础信息管理接口。
   - 提供闲置资源查询与导出接口。
   - 提供 RDP 趋势查询接口。
   - 提供外部系统批量同步接口。
2. `collector-service`
   - 定时拉取 `Zabbix` 原库中的主机与监控基础信息。
   - 接收或解析 RDP 登录事件。
   - 执行闲置资源分析任务。
   - 写入任务执行记录与错误日志。
3. `project-mysql`
   - 存储 InsightOps 自有业务数据。
4. `frontend`
   - 后续采用 `React + shadcn/ui` 提供总览看板、趋势图、闲置清单与资产管理页面。

### 3.2 设计原则

- **解耦原则：** `Zabbix` 原库只做数据来源，InsightOps 的业务逻辑、分析结果与扩展字段全部进入自有库。
- **单一标识原则：** 所有虚机主数据、RDP 事件与 Zabbix 映射均围绕 `IP` 归并。
- **可扩展原则：** 后续接入域控日志、Agent 模式或更多看板指标时，不改变一期的核心模型与接口边界。
- **内网友好原则：** 部署、鉴权、日志和端口暴露方式优先考虑内网运维与安全约束。

## 4. 数据模型设计

### 4.1 表结构总览

一期建议至少包含以下核心表：

- `vm_assets`
- `vm_rdp_logins`
- `idle_vm_snapshots`
- `zabbix_host_mapping`
- `sync_jobs`
- `api_keys`

### 4.2 `vm_assets`

用途：存储虚机主数据与扩展管理字段。

建议字段：

- `ip`：虚机唯一标识，唯一索引。
- `hostname`：主机名。
- `department`：所属部门。
- `lab`：所属研究室。
- `owner`：使用人。
- `os_type`：操作系统类型。
- `status`：资产状态，如启用、停用、待回收。
- `last_rdp_login_at`：最近一次 RDP 登录时间。
- `last_seen_at`：最近一次从 `Zabbix` 观测到的时间。
- `created_at`、`updated_at`：审计字段。

### 4.3 `vm_rdp_logins`

用途：存储标准化后的 RDP 登录明细。

建议字段：

- `ip`
- `login_at`
- `username`
- `domain`
- `source_host`
- `event_id`
- `logon_type`
- `log_source`
- `raw_event_hash`
- `created_at`

设计要求：

- `raw_event_hash` 用于幂等去重。
- 建议按 `ip`、`login_at` 建索引，支撑趋势统计与最近登录查询。

### 4.4 `idle_vm_snapshots`

用途：存储每次闲置分析的结果快照，支持导出与历史追溯。

建议字段：

- `snapshot_date`
- `ip`
- `idle_days`
- `owner`
- `department`
- `lab`
- `recycle_level`
- `reason`
- `last_rdp_login_at`
- `created_at`

### 4.5 `zabbix_host_mapping`

用途：维护项目虚机与 `Zabbix` 主机对象之间的关系。

建议字段：

- `ip`
- `zabbix_hostid`
- `host_name`
- `available`
- `last_sync_at`
- `created_at`
- `updated_at`

### 4.6 `sync_jobs`

用途：记录同步、采集、分析任务的执行过程。

建议字段：

- `job_type`
- `started_at`
- `finished_at`
- `status`
- `processed_count`
- `error_message`
- `created_at`

### 4.7 `api_keys`

用途：管理外部系统调用资产同步接口的凭据。

建议字段：

- `key_name`
- `key_hash`
- `enabled`
- `expires_at`
- `last_used_at`
- `created_at`
- `updated_at`

设计要求：

- 仅存储 `API Key` 的哈希值，不存储明文。
- 支持停用、过期与轮换。

## 5. 采集链路与业务规则

### 5.1 Zabbix 数据接入

InsightOps 通过配置文件读取以下连接参数：

- `host`
- `port`
- `username`
- `password`
- `database`
- `charset`

接入要求如下：

- 兼容 `Zabbix` 原生表结构。
- 优先读取主机、接口、可用性与后续分析必需的常用监控数据。
- 采用只读连接，不直接修改 `Zabbix` 数据。
- 拉取后的标准化结果写入 `zabbix_host_mapping` 及后续扩展缓存表。

### 5.2 RDP 登录数据接入

一期以 `Windows` 安全日志为主，识别规则如下：

- `Event ID = 4624`
- `Logon Type = 10`

处理流程如下：

1. 采集端从目标虚机、日志汇聚节点或跳板机读取安全日志。
2. 过滤出符合远程桌面登录条件的事件。
3. 将事件发送至 InsightOps 接入层。
4. 服务端完成字段标准化与幂等校验。
5. 明细写入 `vm_rdp_logins`。
6. 更新 `vm_assets.last_rdp_login_at`。
7. 写入任务记录与异常日志。

### 5.3 幂等与时间规则

- 相同事件重复上报时，不得写出重复明细。
- 所有时间统一以 `UTC` 入库。
- 接口响应可按系统配置的时区格式化返回。

### 5.4 闲置资源识别规则

一期采用单一、清晰的规则：

- 若虚机连续 `30` 天未发生符合条件的 RDP 登录，则视为候选闲置虚机。

计算逻辑如下：

1. 以 `vm_assets` 为全量资产集合。
2. 关联最近一次 RDP 登录时间。
3. 若从未登录，则标记为“自纳管以来未登录”。
4. 若已登录，则计算 `idle_days = 当前时间 - last_rdp_login_at`。
5. 当 `idle_days >= 30` 时写入分析快照。

### 5.5 回收建议分级

为便于运维与管理决策，建议按以下区间分级：

- `30-59` 天：低优先级回收建议。
- `60-89` 天：中优先级回收建议。
- `90+` 天：高优先级回收建议。

输出清单应至少包含：

- `ip`
- `hostname`
- `department`
- `lab`
- `owner`
- `last_rdp_login_at`
- `idle_days`
- `zabbix_available`

## 6. API 设计边界

### 6.1 资产管理 API

用途：

- 手工新增、修改、查询虚机基础信息。
- 支持外部系统按 `IP` 批量同步资产。

关键要求：

- `IP` 为唯一业务键。
- 批量同步采用 `upsert` 语义。
- 支持分页查询、条件过滤与单条详情读取。

### 6.2 外部同步 API

用途：

- 接收外部系统同步的部门、研究室、使用人等扩展字段。

鉴权方式：

- 请求头使用 `X-API-Key`。

文档要求：

- 明确请求参数、返回格式、错误码、幂等规则与调用示例。

### 6.3 RDP 趋势 API

用途：

- 为后续前端趋势图提供日、周、月粒度的登录次数统计。

关键要求：

- 查询维度支持 `day`、`week`、`month`。
- 返回结果支持图表直接消费。
- 聚合逻辑在服务端统一完成。

### 6.4 闲置分析 API

用途：

- 查询最新一次闲置分析快照。
- 支持导出候选回收清单。

导出格式：

- 一期支持 `CSV`，后续可扩展为 `Excel`。

## 7. 前后端模块划分

### 7.1 后端目录建议

建议新增 `backend/`，内部按职责拆分为：

- `api/`
- `collector/`
- `models/`
- `repositories/`
- `services/`
- `tasks/`
- `schemas/`
- `core/`

职责说明：

- `api/`：定义 `RESTful API` 路由。
- `collector/`：实现 `Zabbix` 与 `RDP` 适配器。
- `models/`：定义数据库模型。
- `repositories/`：处理数据访问。
- `services/`：封装业务逻辑。
- `tasks/`：负责定时任务与后台任务。
- `schemas/`：定义请求与响应模型。
- `core/`：集中管理配置、日志、鉴权与公共基础设施。

### 7.2 前端目录建议

建议新增 `frontend/`，技术栈采用 `React + Vite + shadcn/ui`。

建议页面模块如下：

- 总览看板
- RDP 登录趋势
- 闲置资源清单
- 虚机基础信息管理

一期前端策略：

- 先搭建布局、导航、接口封装层与空态页面。
- 趋势图组件独立设计，为后续扩展更多指标曲线预留复用能力。

## 8. 部署与运行设计

### 8.1 本地开发环境

使用 `conda` 创建隔离环境并统一依赖管理。

推荐流程：

1. 创建 InsightOps 专用 `conda` 环境。
2. 安装 `FastAPI`、数据库驱动、任务调度与测试依赖。
3. 导出依赖清单，供容器镜像构建使用。

### 8.2 容器组成

一期建议包含以下容器：

- `insightops-api`
- `insightops-collector`
- `insightops-mysql`
- `insightops-frontend`

说明：

- 不打包 `Zabbix` 容器。
- 通过环境变量连接现有内网 `Zabbix MySQL`。
- InsightOps 自有 `MySQL` 仅承载业务表。

### 8.3 网络与安全要求

- 服务端口仅对内网开放。
- `MySQL` 默认仅在容器内部网络可见。
- 日志中不得输出数据库密码与 `API Key` 明文。
- 生产部署默认关闭 `debug`。
- 容器优先以非 `root` 用户运行。

### 8.4 交付文件建议

建议新增 `deploy/` 或 `infra/` 目录，存放：

- `Dockerfile`
- `docker-compose.yml`
- `.env.example`
- 初始化脚本
- 内网部署手册

## 9. 文档与交付要求

### 9.1 接口文档

需单独提供完整接口对接文档，至少包括：

- 鉴权方式
- 请求头要求
- 请求参数说明
- 返回格式说明
- 错误码说明
- 幂等规则说明
- `curl` 示例
- `Python` 调用示例

### 9.2 部署文档

需输出完整内网部署手册，至少包括：

- 环境准备
- 配置项说明
- 首次启动流程
- 数据库初始化
- `Zabbix` 连通性验证
- `API Key` 配置
- 常见故障排查
- 升级步骤

### 9.3 验收交付

一期验收至少覆盖以下内容：

- 业务数据库可正常初始化。
- 可通过配置读取现有 `Zabbix` 数据源。
- 可接收并落库标准化 RDP 登录事件。
- 可查询虚机资产信息与最近登录时间。
- 可生成默认 `30` 天阈值下的闲置虚机清单。
- 可导出候选回收清单。
- 可通过容器在内网环境正常启动。

## 10. 风险与后续扩展

### 10.1 一期主要风险

- `Windows` 安全日志来源可能受权限与采集部署位置限制。
- 现网 `Zabbix` 表结构与版本差异可能影响查询 SQL 的兼容性。
- 仅以 RDP 登录判定闲置，可能对少量非 RDP 使用场景产生误判。

### 10.2 后续扩展方向

- 增加域控日志接入。
- 增加 Agent 采集模式。
- 引入 CPU、内存、磁盘活跃度作为辅助闲置判定条件。
- 完善前端看板视觉设计与交互体验。
- 增加 `Excel` 导出与更丰富的统计报表。

## 11. 结论

本设计将 InsightOps 一期收敛为“后端数据底座”建设：通过配置化对接 `Zabbix`，以独立 `MySQL` 承载业务数据，以 `Windows` 安全日志承载 RDP 登录来源，以 `FastAPI` 提供统一 API，并为后续前端看板、闲置分析和内网部署交付打下稳定基础。
