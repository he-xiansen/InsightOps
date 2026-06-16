# InsightOps OLED 暗色模式界面设计

> 为运维资产分析平台量身打造的精致暗色界面，面向 OLED 显示屏和长期值守场景优化。

## 1. 色彩体系

### 1.1 基础色板

| Token | HSL 值 | 用途 |
|-------|--------|------|
| `--background` | `222.2 47.4% 4.2%` | 真实黑色基底，提高 OLED 效率 |
| `--foreground` | `210 40% 90%` | 主文本，柔和替代纯白 |
| `--card` | `224 44% 11%` | 卡片/面板底色 |
| `--card-foreground` | `210 40% 90%` | 卡片主文本 |
| `--muted` | `217.2 32.6% 17.5%` | 静默背景 |
| `--muted-foreground` | `215 20.2% 65.1%` | 次要信息文本 |
| `--tertiary-foreground` | `215 15% 50%` | 三级辅助文字（新增） |
| `--primary` | `217.2 91.2% 59.8%` | 蓝色强调色，关键操作/活跃状态 |
| `--primary-foreground` | `210 40% 98%` | 主强调色上文本 |
| `--secondary` | `217.2 32.6% 17.5%` | 次要背景 |
| `--border` | `217.2 32.6% 24%` | 边框色 |

### 1.2 关键规则

- **不使用纯白 `#fff`**：主文本上限 `hsl(210 40% 90%)`
- **三级文本递减**：主 > 次要 > 辅助 = 90% > 65% > 50% 亮度
- **数据语义色降饱和**：告警/错误等语义色饱和度限制在 50-60%
- **强调色节制使用**：蓝色仅用于关键操作和激活态，不做大面积填充

## 2. 层次与深度

### 2.1 层叠策略

- 层间分隔通过**背景亮度递进**实现，而非投影
  - 最底层：`--background` (`4.2%`)
  - 卡片层：`--card` (`11%`)
  - 弹层/浮层：`--card` + `backdrop-blur-xl` + `ring-1 ring-white/10`
- 面板间隔使用 **0.5px 微妙边框** `hsla(217, 32%, 60%, 0.08)`，减少发光面积

### 2.2 导航交互

| 状态 | 样式 |
|------|------|
| 默认 | `border-border/80 bg-card/60` |
| 悬停 | `hover:border-primary/30 hover:bg-accent/10` |
| 激活 | `border-primary/50 bg-primary/15` |

- 激活态仅提升边框透明度和背景色相，避免亮度跳跃
- 过渡控制在 150-200ms ease-out

### 2.3 数据表格

- 行分隔：极淡网格线 `hsla(217, 32%, 60%, 0.06)`
- 行悬停：`hover:bg-white/[0.04]`，仅提升 4% 透明度
- 斑马纹（可选）：奇偶行差异不超过 2% 亮度

## 3. 交互反馈

### 3.1 按钮

| 变体 | 默认 | 悬停 |
|------|------|------|
| default | `bg-primary` | `bg-primary/90` — 仅调透明度 |
| outline | `bg-background/50 border-input` | `hover:bg-accent/20` |
| ghost | 透明 | `hover:bg-accent/20` |
| secondary | `bg-secondary` | `hover:bg-secondary/80` |

- 焦点环：`ring-primary/40` 半透明
- 禁用态：`opacity-35`（暗色中较 `opacity-50` 更不显眼）

## 4. 排版

### 4.1 字体栈

```
font-family: Inter, "Segoe UI", system-ui, -apple-system,
             BlinkMacSystemFont, "PingFang SC", sans-serif;
```

### 4.2 可读性规则

- 正文 `text-sm` / `text-base`，行高 `leading-6` 至 `leading-7`
- 数字与代码片段使用 `tabular-nums` 等宽数字，便于数据列对齐
- 说明文字统一 `text-sm text-muted-foreground`，视觉后退一层
- 标题层级使用字重递进（semibold → bold）而非大幅增大字号

## 5. 数据可视化适配

### 5.1 图表

- 背景透明（`fill: none`）
- 轴线透明度 0.2，数据线透明度 0.85
- 图表区域不使用纯色填充，使用渐变透明度

### 5.2 工具提示

- 背景：`bg-card/95 backdrop-blur-xl`
- 边缘光：`ring-1 ring-white/10`
- 文本同理暗色规范，使用柔和白色

### 5.3 状态标签 (Badge)

- 使用低饱和度变体：`bg-primary/20`、`bg-secondary` 等
- 避免高亮纯色填充

## 6. 明暗过渡与边界处理

### 6.1 过渡动画

- 所有色彩过渡通过 HSL 透明度实现，避免亮度层级闪烁
- 过渡时长统一 200ms ease-out

### 6.2 图像资源

- 图片叠加 `dark:brightness-[0.85]` 滤镜
- 防止大面积白色区域在暗色模式中突兀

### 6.3 模态/遮罩

- 遮罩层 `bg-black/60`，保持背景可辨
- 内容区使用多层毛玻璃叠加

## 7. 长期使用关怀

### 7.1 光适应

- 环境光感应（如设备支持）可自动微调背景色温
- 夜间模式：蓝色主色混入 5% 琥珀色相，减少蓝光刺激

### 7.2 对比度策略

- 次要信息对比度接近但不低于 WCAG AA 4.5:1
- 降低视觉皮层负担，延缓长时间阅读疲劳

### 7.3 骨架屏

- 使用 `animate-pulse bg-muted`，闪烁频率 1.5s 慢脉冲
- 避免快速闪烁对视觉的刺激

## 8. 组件级细则

### 8.1 卡片

- `rounded-2xl` 大圆角 + `shadow-shell` 柔和阴影
- 默认 `bg-card/85 backdrop-blur` 半透明毛玻璃效果
- 层级递进：可叠加 `from-card via-card to-primary/10` 渐变

### 8.2 导航栏

- 侧栏固定 280px，右侧 1fr 内容区
- 边框 `border-border/70`，背景 `bg-background/30 backdrop-blur`

## 9. 设计原则总结

1. **真实黑底**：最大化 OLED 能效，减少发光面积
2. **柔和文本**：杜绝纯白，三级递减
3. **亮度分层**：背景亮度递进创造层次，而非投影
4. **节制强调**：蓝色仅用于关键操作，语义色降饱和
5. **数据优先**：图表透明背景，表格极淡分割
6. **长期友好**：慢脉冲骨架屏、可调色温、降低视觉负担
