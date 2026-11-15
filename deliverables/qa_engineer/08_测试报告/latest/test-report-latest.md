# 批量回测功能测试执行报告

## 执行摘要

| 指标 | 数值 |
|------|------|
| 执行时间 | 2026/3/17 02:42:54 |
| 总用例数 | 81 |
| 通过 | 15 ✅ |
| 失败 | 48 ❌ |
| 跳过 | 18 ⏭️ |
| 通过率 | 18.52% |
| 执行时长 | 9596ms |

## 测试环境

| 项目 | 内容 |
|------|------|
| API地址 | http://localhost:3099 |
| Node版本 | v24.12.0 |
| 平台 | win32 |

## 详细结果

### ❌ POST /backtest/batch - 创建批量任务

| 用例 | 状态 | 耗时 | 时间戳 |
|------|------|------|--------|
| TC-01-001: 创建批量任务-全部交易对 | ❌ failed ([2mexpect([22m[31mreceived[39m[2m).[22mtoBe...) | 2496ms | 02:42:47 |
| TC-01-002: 创建批量任务-指定交易对 | ❌ failed ([2mexpect([22m[31mreceived[39m[2m).[22mtoBe...) | 51ms | 02:42:47 |
| TC-01-003: 创建批量任务-无效策略 | ✅ passed | 108ms | 02:42:47 |
| TC-01-004: 创建批量任务-无效交易对 | ❌ failed ([2mexpect([22m[31mreceived[39m[2m).[22mtoBe...) | 18ms | 02:42:47 |
| TC-01-005: 创建批量任务-超过10000个交易对 | ❌ failed ([2mexpect([22m[31mreceived[39m[2m).[22mtoBe...) | 17ms | 02:42:47 |
| TC-01-007: 创建批量任务-队列已满 | ⏭️ skipped | 0ms | 02:42:52 |
| TC-01-008: 创建批量任务-无效参数 | ✅ passed | 6ms | 02:42:52 |

**统计**: 总计 7 | 通过 2 | 失败 4 | 跳过 1

### ❌ GET /backtest/batch - 查询批量任务

| 用例 | 状态 | 耗时 | 时间戳 |
|------|------|------|--------|
| TC-02-001: 查询批量任务列表-默认参数 | ❌ failed (Request failed with status code 500...) | 4ms | 02:42:52 |
| TC-02-002: 查询批量任务列表-带状态过滤 | ❌ failed (Request failed with status code 500...) | 7ms | 02:42:52 |
| TC-02-003: 查询批量任务列表-分页 | ❌ failed (Request failed with status code 500...) | 4ms | 02:42:52 |
| TC-02-004: 查询批量任务详情-成功 | ❌ failed (Request failed with status code 400...) | 16ms | 02:42:52 |
| TC-02-005: 查询批量任务详情-不存在 | ✅ passed | 2ms | 02:42:52 |
| TC-02-006: 查询子任务列表-默认 | ❌ failed (Request failed with status code 400...) | 15ms | 02:42:52 |
| TC-02-007: 查询子任务列表-带状态过滤 | ❌ failed (Request failed with status code 400...) | 13ms | 02:42:52 |
| TC-02-008: 查询子任务列表-分页 | ❌ failed (Request failed with status code 400...) | 13ms | 02:42:52 |
| TC-02-009: 查询子任务列表-批量任务不存在 | ❌ failed (Cannot read properties of undefined (reading 'stat...) | 32ms | 02:42:52 |
| TC-02-010: 查询子任务详情-成功 | ❌ failed (Request failed with status code 400...) | 16ms | 02:42:52 |
| TC-02-011: 查询子任务详情-不存在 | ✅ passed | 15ms | 02:42:52 |
| TC-02-012: 查询进度-成功 | ❌ failed (Request failed with status code 404...) | 17ms | 02:42:52 |
| TC-02-013: 查询进度-任务不存在 | ✅ passed | 1ms | 02:42:52 |
| TC-02-014: 查询进度-实时更新 | ⏭️ skipped | 0ms | 02:42:52 |
| TC-02-015: 查询历史任务-时间范围过滤 | ❌ failed (Request failed with status code 500...) | 4ms | 02:42:52 |
| TC-02-016: 查询历史任务-策略过滤 | ❌ failed (Request failed with status code 500...) | 3ms | 02:42:52 |
| TC-02-017: 查询历史任务-组合过滤 | ❌ failed (Request failed with status code 500...) | 2ms | 02:42:52 |
| TC-02-018: 查询任务统计-成功 | ❌ failed (Request failed with status code 400...) | 2ms | 02:42:52 |
| TC-02-019: 查询任务统计-无权限 | ⏭️ skipped | 0ms | 02:42:52 |
| TC-02-020: 导出任务结果-CSV格式 | ❌ failed (Request failed with status code 404...) | 17ms | 02:42:52 |
| TC-02-021: 导出任务结果-JSON格式 | ❌ failed (Request failed with status code 404...) | 11ms | 02:42:52 |
| TC-02-022: 导出任务结果-任务未完成 | ❌ failed ([2mexpect([22m[31mreceived[39m[2m).[22mtoCon...) | 14ms | 02:42:52 |

**统计**: 总计 22 | 通过 3 | 失败 17 | 跳过 2

### ❌ 任务控制 API

| 用例 | 状态 | 耗时 | 时间戳 |
|------|------|------|--------|
| TC-03-001: 启动任务-成功 | ❌ failed (Request failed with status code 400...) | 14ms | 02:42:52 |
| TC-03-002: 启动任务-任务不存在 | ✅ passed | 3ms | 02:42:52 |
| TC-03-003: 启动任务-状态不允许 | ❌ failed (Request failed with status code 400...) | 12ms | 02:42:52 |
| TC-03-004: 暂停任务-成功 | ❌ failed (Request failed with status code 400...) | 16ms | 02:42:52 |
| TC-03-005: 暂停任务-任务不存在 | ✅ passed | 3ms | 02:42:52 |
| TC-03-006: 暂停任务-状态不允许 | ✅ passed | 16ms | 02:42:52 |
| TC-03-007: 暂停任务-暂停超时 | ⏭️ skipped | 0ms | 02:42:52 |
| TC-03-008: 继续任务-成功 | ❌ failed (Request failed with status code 400...) | 16ms | 02:42:53 |
| TC-03-009: 继续任务-任务不存在 | ✅ passed | 3ms | 02:42:53 |
| TC-03-010: 继续任务-状态不允许 | ✅ passed | 13ms | 02:42:53 |
| TC-03-011: 取消任务-成功 | ❌ failed (Request failed with status code 400...) | 15ms | 02:42:53 |
| TC-03-012: 取消任务-任务不存在 | ✅ passed | 16ms | 02:42:53 |
| TC-03-013: 取消任务-状态不允许 | ❌ failed (Request failed with status code 400...) | 69ms | 02:42:53 |
| TC-03-014: 重试失败任务-成功 | ❌ failed (Request failed with status code 400...) | 1002ms | 02:42:54 |
| TC-03-015: 强制重试-成功 | ❌ failed (Request failed with status code 400...) | 19ms | 02:42:54 |

**统计**: 总计 15 | 通过 6 | 失败 8 | 跳过 1

### ❌ 结果查询 API

| 用例 | 状态 | 耗时 | 时间戳 |
|------|------|------|--------|
| TC-04-001: 查询汇总结果-成功 | ❌ failed (Request failed with status code 400...) | 20ms | 02:42:54 |
| TC-04-002: 查询汇总结果-任务不存在 | ✅ passed | 5ms | 02:42:54 |
| TC-04-003: 查询汇总结果-无完成项 | ❌ failed (Request failed with status code 400...) | 24ms | 02:42:54 |
| TC-04-004: 查询详细结果-成功 | ❌ failed (Request failed with status code 404...) | 20ms | 02:42:54 |
| TC-04-005: 查询详细结果-分页 | ❌ failed (Request failed with status code 404...) | 34ms | 02:42:54 |
| TC-04-006: 对比结果-成功 | ❌ failed (Request failed with status code 400...) | 46ms | 02:42:54 |
| TC-04-007: 对比结果-任务数量不匹配 | ✅ passed | 2ms | 02:42:54 |
| TC-04-008: 导出汇总-CSV | ❌ failed (Request failed with status code 404...) | 13ms | 02:42:54 |
| TC-04-009: 导出汇总-JSON | ❌ failed (Request failed with status code 404...) | 14ms | 02:42:54 |
| TC-04-010: 导出明细-CSV | ❌ failed (Request failed with status code 404...) | 18ms | 02:42:54 |
| TC-04-011: 导出明细-JSON | ❌ failed (Request failed with status code 404...) | 25ms | 02:42:54 |

**统计**: 总计 11 | 通过 2 | 失败 9 | 跳过 0

### ❌ 并发与边界测试

| 用例 | 状态 | 耗时 | 时间戳 |
|------|------|------|--------|
| TC-05-001: 并发创建任务-限制检查 | ✅ passed | 29ms | 02:42:54 |
| TC-05-002: 并发创建任务-队列顺序 | ⏭️ skipped | 0ms | 02:42:54 |
| TC-05-003: 数据库连接中断-恢复 | ⏭️ skipped | 0ms | 02:42:54 |
| TC-05-004: 数据库连接中断-任务状态 | ⏭️ skipped | 0ms | 02:42:54 |
| TC-05-005: 服务重启-任务恢复 | ⏭️ skipped | 0ms | 02:42:54 |
| TC-05-006: 服务重启-进度保持 | ⏭️ skipped | 0ms | 02:42:54 |
| TC-05-007: 子任务超时-自动失败 | ⏭️ skipped | 0ms | 02:42:54 |
| TC-05-008: 子任务超时-超时配置 | ⏭️ skipped | 0ms | 02:42:54 |
| TC-05-009: 重试次数限制-达到上限 | ⏭️ skipped | 0ms | 02:42:54 |
| TC-05-010: 重试次数限制-强制重试 | ❌ failed (Request failed with status code 400...) | 13ms | 02:42:54 |
| TC-05-011: 内存使用-大任务 | ⏭️ skipped | 0ms | 02:42:54 |
| TC-05-012: 内存使用-监控 | ⏭️ skipped | 0ms | 02:42:54 |
| TC-05-013: 长时间运行-稳定性 | ⏭️ skipped | 0ms | 02:42:54 |

**统计**: 总计 13 | 通过 1 | 失败 1 | 跳过 11

### ❌ 队列管理 API

| 用例 | 状态 | 耗时 | 时间戳 |
|------|------|------|--------|
| TC-07-001: 获取队列状态-成功 | ❌ failed ([2mexpect([22m[31mreceived[39m[2m).[22mtoBe...) | 2ms | 02:42:54 |
| TC-07-002: 获取队列状态-空队列 | ❌ failed ([2mexpect([22m[31mreceived[39m[2m).[22mtoBe...) | 2ms | 02:42:54 |
| TC-07-003: 获取队列状态-有任务 | ❌ failed ([2mexpect([22m[31mreceived[39m[2m).[22mtoBeG...) | 14ms | 02:42:54 |
| TC-07-004: 获取队列列表-成功 | ❌ failed (Request failed with status code 500...) | 2ms | 02:42:54 |
| TC-07-005: 获取队列列表-分页 | ❌ failed (Request failed with status code 500...) | 1ms | 02:42:54 |
| TC-07-006: 获取队列列表-空队列 | ❌ failed (Request failed with status code 500...) | 2ms | 02:42:54 |
| TC-07-007: 取消队列任务-成功 | ❌ failed (Request failed with status code 400...) | 15ms | 02:42:54 |
| TC-07-008: 取消队列任务-任务不存在 | ✅ passed | 2ms | 02:42:54 |
| TC-07-009: 取消队列任务-任务已开始 | ❌ failed (Request failed with status code 400...) | 13ms | 02:42:54 |
| TC-07-010: 取消队列任务-无权限 | ⏭️ skipped | 0ms | 02:42:54 |
| TC-07-011: 队列满时创建任务 | ⏭️ skipped | 0ms | 02:42:54 |
| TC-07-012: 队列任务执行顺序 | ⏭️ skipped | 0ms | 02:42:54 |
| TC-07-013: 队列任务状态同步 | ❌ failed (Request failed with status code 400...) | 13ms | 02:42:54 |

**统计**: 总计 13 | 通过 1 | 失败 9 | 跳过 3

## ❌ 失败用例汇总

| 测试套件 | 测试用例 | 失败原因 | 时间戳 |
|----------|----------|----------|--------|
| POST /backtest/batch - 创建批量任务 | TC-01-001: 创建批量任务-全部交易对 | [2mexpect([22m[31mreceived[39m[2m).[22mtoBe[2m([22m[32mexpected[39m[2 | 02:42:47 |
| POST /backtest/batch - 创建批量任务 | TC-01-002: 创建批量任务-指定交易对 | [2mexpect([22m[31mreceived[39m[2m).[22mtoBe[2m([22m[32mexpected[39m[2 | 02:42:47 |
| POST /backtest/batch - 创建批量任务 | TC-01-004: 创建批量任务-无效交易对 | [2mexpect([22m[31mreceived[39m[2m).[22mtoBe[2m([22m[32mexpected[39m[2 | 02:42:47 |
| POST /backtest/batch - 创建批量任务 | TC-01-005: 创建批量任务-超过10000个交易对 | [2mexpect([22m[31mreceived[39m[2m).[22mtoBe[2m([22m[32mexpected[39m[2 | 02:42:47 |
| GET /backtest/batch - 查询批量任务 | TC-02-001: 查询批量任务列表-默认参数 | Request failed with status code 500 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-002: 查询批量任务列表-带状态过滤 | Request failed with status code 500 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-003: 查询批量任务列表-分页 | Request failed with status code 500 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-004: 查询批量任务详情-成功 | Request failed with status code 400 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-006: 查询子任务列表-默认 | Request failed with status code 400 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-007: 查询子任务列表-带状态过滤 | Request failed with status code 400 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-008: 查询子任务列表-分页 | Request failed with status code 400 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-009: 查询子任务列表-批量任务不存在 | Cannot read properties of undefined (reading 'status') | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-010: 查询子任务详情-成功 | Request failed with status code 400 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-012: 查询进度-成功 | Request failed with status code 404 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-015: 查询历史任务-时间范围过滤 | Request failed with status code 500 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-016: 查询历史任务-策略过滤 | Request failed with status code 500 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-017: 查询历史任务-组合过滤 | Request failed with status code 500 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-018: 查询任务统计-成功 | Request failed with status code 400 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-020: 导出任务结果-CSV格式 | Request failed with status code 404 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-021: 导出任务结果-JSON格式 | Request failed with status code 404 | 02:42:52 |
| GET /backtest/batch - 查询批量任务 | TC-02-022: 导出任务结果-任务未完成 | [2mexpect([22m[31mreceived[39m[2m).[22mtoContain[2m([22m[32mexpected[3 | 02:42:52 |
| 任务控制 API | TC-03-001: 启动任务-成功 | Request failed with status code 400 | 02:42:52 |
| 任务控制 API | TC-03-003: 启动任务-状态不允许 | Request failed with status code 400 | 02:42:52 |
| 任务控制 API | TC-03-004: 暂停任务-成功 | Request failed with status code 400 | 02:42:52 |
| 任务控制 API | TC-03-008: 继续任务-成功 | Request failed with status code 400 | 02:42:53 |
| 任务控制 API | TC-03-011: 取消任务-成功 | Request failed with status code 400 | 02:42:53 |
| 任务控制 API | TC-03-013: 取消任务-状态不允许 | Request failed with status code 400 | 02:42:53 |
| 任务控制 API | TC-03-014: 重试失败任务-成功 | Request failed with status code 400 | 02:42:54 |
| 任务控制 API | TC-03-015: 强制重试-成功 | Request failed with status code 400 | 02:42:54 |
| 结果查询 API | TC-04-001: 查询汇总结果-成功 | Request failed with status code 400 | 02:42:54 |
| 结果查询 API | TC-04-003: 查询汇总结果-无完成项 | Request failed with status code 400 | 02:42:54 |
| 结果查询 API | TC-04-004: 查询详细结果-成功 | Request failed with status code 404 | 02:42:54 |
| 结果查询 API | TC-04-005: 查询详细结果-分页 | Request failed with status code 404 | 02:42:54 |
| 结果查询 API | TC-04-006: 对比结果-成功 | Request failed with status code 400 | 02:42:54 |
| 结果查询 API | TC-04-008: 导出汇总-CSV | Request failed with status code 404 | 02:42:54 |
| 结果查询 API | TC-04-009: 导出汇总-JSON | Request failed with status code 404 | 02:42:54 |
| 结果查询 API | TC-04-010: 导出明细-CSV | Request failed with status code 404 | 02:42:54 |
| 结果查询 API | TC-04-011: 导出明细-JSON | Request failed with status code 404 | 02:42:54 |
| 并发与边界测试 | TC-05-010: 重试次数限制-强制重试 | Request failed with status code 400 | 02:42:54 |
| 队列管理 API | TC-07-001: 获取队列状态-成功 | [2mexpect([22m[31mreceived[39m[2m).[22mtoBe[2m([22m[32mexpected[39m[2 | 02:42:54 |
| 队列管理 API | TC-07-002: 获取队列状态-空队列 | [2mexpect([22m[31mreceived[39m[2m).[22mtoBe[2m([22m[32mexpected[39m[2 | 02:42:54 |
| 队列管理 API | TC-07-003: 获取队列状态-有任务 | [2mexpect([22m[31mreceived[39m[2m).[22mtoBeGreaterThanOrEqual[2m([22m[3 | 02:42:54 |
| 队列管理 API | TC-07-004: 获取队列列表-成功 | Request failed with status code 500 | 02:42:54 |
| 队列管理 API | TC-07-005: 获取队列列表-分页 | Request failed with status code 500 | 02:42:54 |
| 队列管理 API | TC-07-006: 获取队列列表-空队列 | Request failed with status code 500 | 02:42:54 |
| 队列管理 API | TC-07-007: 取消队列任务-成功 | Request failed with status code 400 | 02:42:54 |
| 队列管理 API | TC-07-009: 取消队列任务-任务已开始 | Request failed with status code 400 | 02:42:54 |
| 队列管理 API | TC-07-013: 队列任务状态同步 | Request failed with status code 400 | 02:42:54 |

---
*报告生成时间: 2026/3/17 02:42:54*
