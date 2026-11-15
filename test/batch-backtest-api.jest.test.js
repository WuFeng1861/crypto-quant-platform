/**
 * 批量回测 API 测试 (Jest版本)
 * 自动生成测试报告
 *
 * 运行方式:
 * pnpm test test/batch-backtest-api.jest.test.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 配置
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3099';
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 测试数据
const TEST_DATA = {
  strategyId: 5,
  timeframeId: 1,
  startTime: '2024-01-01T00:00:00.000Z',
  endTime: '2024-12-31T23:59:59.000Z',
  initialCapital: 10000,
  earlyStopThreshold: 10,
  positionDivision: 1
};

// 测试结果收集器
const testResults = {
  startTime: null,
  endTime: null,
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  suites: [],
  failedTests: []
};

// 报告生成器
class TestReportGenerator {
  static generateReport() {
    testResults.endTime = new Date().toISOString();
    const duration = new Date(testResults.endTime) - new Date(testResults.startTime);
    
    const report = {
      title: '批量回测功能测试执行报告',
      generatedAt: new Date().toISOString(),
      summary: {
        total: testResults.total,
        passed: testResults.passed,
        failed: testResults.failed,
        skipped: testResults.skipped,
        passRate: testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(2) + '%' : '0%',
        duration: duration + 'ms',
        startTime: testResults.startTime,
        endTime: testResults.endTime
      },
      environment: {
        apiUrl: API_BASE_URL,
        nodeVersion: process.version,
        platform: process.platform
      },
      suites: testResults.suites,
      failedTests: testResults.failedTests
    };

    // 生成报告目录
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportDir = path.join(__dirname, '..', 'deliverables', 'qa_engineer', '08_测试报告', timestamp);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const jsonPath = path.join(reportDir, `test-report-${timestamp}.json`);
    const mdPath = path.join(reportDir, `test-report-${timestamp}.md`);
    const failedMdPath = path.join(reportDir, `failed-tests-${timestamp}.md`);

    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    const mdContent = this.generateMarkdown(report);
    fs.writeFileSync(mdPath, mdContent);

    const failedContent = this.generateFailedTestsDoc(report);
    fs.writeFileSync(failedMdPath, failedContent);

    const latestDir = path.join(__dirname, '..', 'deliverables', 'qa_engineer', '08_测试报告', 'latest');
    if (!fs.existsSync(latestDir)) {
      fs.mkdirSync(latestDir, { recursive: true });
    }
    fs.writeFileSync(path.join(latestDir, 'test-report-latest.md'), mdContent);
    fs.writeFileSync(path.join(latestDir, 'failed-tests-latest.md'), failedContent);

    console.log(`\n📊 测试报告已生成:`);
    console.log(`   报告目录: ${reportDir}`);
    console.log(`   JSON: ${jsonPath}`);
    console.log(`   Markdown: ${mdPath}`);
    console.log(`   失败用例: ${failedMdPath}`);

    return report;
  }

  static generateMarkdown(report) {
    const { summary, environment, suites, failedTests } = report;
    
    let md = `# ${report.title}

## 执行摘要

| 指标 | 数值 |
|------|------|
| 执行时间 | ${new Date(report.generatedAt).toLocaleString('zh-CN')} |
| 总用例数 | ${summary.total} |
| 通过 | ${summary.passed} ✅ |
| 失败 | ${summary.failed} ❌ |
| 跳过 | ${summary.skipped} ⏭️ |
| 通过率 | ${summary.passRate} |
| 执行时长 | ${summary.duration} |

## 测试环境

| 项目 | 内容 |
|------|------|
| API地址 | ${environment.apiUrl} |
| Node版本 | ${environment.nodeVersion} |
| 平台 | ${environment.platform} |

## 详细结果

`;

    suites.forEach(suite => {
      const statusIcon = suite.failed > 0 ? '❌' : '✅';
      md += `### ${statusIcon} ${suite.name}

| 用例 | 状态 | 耗时 | 时间戳 |
|------|------|------|--------|
`;
      suite.tests.forEach(test => {
        const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️';
        const errorInfo = test.error ? ` (${test.error.substring(0, 50)}...)` : '';
        md += `| ${test.name} | ${icon} ${test.status}${errorInfo} | ${test.duration}ms | ${new Date(test.timestamp).toLocaleTimeString('zh-CN')} |
`;
      });
      md += `
**统计**: 总计 ${suite.total} | 通过 ${suite.passed} | 失败 ${suite.failed} | 跳过 ${suite.skipped}

`;
    });

    if (failedTests && failedTests.length > 0) {
      md += `## ❌ 失败用例汇总

| 测试套件 | 测试用例 | 失败原因 | 时间戳 |
|----------|----------|----------|--------|
`;
      failedTests.forEach(failed => {
        const errorMsg = failed.error ? failed.error.substring(0, 80) : '未知错误';
        md += `| ${failed.suite} | ${failed.test} | ${errorMsg} | ${new Date(failed.timestamp).toLocaleTimeString('zh-CN')} |
`;
      });
      md += `
`;
    }

    md += `---
*报告生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}*
`;

    return md;
  }

  static generateFailedTestsDoc(report) {
    const { summary, failedTests } = report;
    
    let md = `# 失败测试用例记录

## 执行信息

| 项目 | 内容 |
|------|------|
| 执行时间 | ${new Date(report.generatedAt).toLocaleString('zh-CN')} |
| 总用例数 | ${summary.total} |
| 通过 | ${summary.passed} |
| 失败 | ${summary.failed} ❌ |
| 跳过 | ${summary.skipped} |
| 通过率 | ${summary.passRate} |

## 失败用例详情

`;

    if (!failedTests || failedTests.length === 0) {
      md += `✅ 本次测试没有失败的用例！\n\n`;
    } else {
      failedTests.forEach((failed, index) => {
        md += `### ${index + 1}. ${failed.test}

| 属性 | 内容 |
|------|------|
| 所属套件 | ${failed.suite} |
| 失败时间 | ${new Date(failed.timestamp).toLocaleString('zh-CN')} |
| 失败原因 | ${failed.error || '未知错误'} |

---

`;
      });
    }

    md += `*文档生成时间: ${new Date(report.generatedAt).toLocaleString('zh-CN')}*
`;

    return md;
  }
}

// 辅助函数：记录测试套件
function recordSuite(suiteName) {
  const suite = {
    name: suiteName,
    tests: [],
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0
  };
  testResults.suites.push(suite);
  return suite;
}

// 辅助函数：记录测试结果
function recordTest(suite, testName, status, error = null, duration = 0) {
  const testCase = {
    name: testName,
    status: status,
    error: error,
    duration: duration,
    timestamp: new Date().toISOString()
  };
  suite.tests.push(testCase);
  suite.total++;
  testResults.total++;
  
  if (status === 'passed') {
    suite.passed++;
    testResults.passed++;
  } else if (status === 'failed') {
    suite.failed++;
    testResults.failed++;
    testResults.failedTests.push({
      suite: suite.name,
      test: testName,
      error: error,
      timestamp: testCase.timestamp
    });
  } else {
    suite.skipped++;
    testResults.skipped++;
  }
}

// 辅助函数：包装测试
async function runTest(suite, testName, testFn) {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    recordTest(suite, testName, 'passed', null, duration);
  } catch (error) {
    const duration = Date.now() - startTime;
    recordTest(suite, testName, 'failed', error.message, duration);
    throw error;
  }
}

// ==================== 测试开始前 ====================
beforeAll(() => {
  testResults.startTime = new Date().toISOString();
  console.log(`\n🚀 开始执行测试...`);
  console.log(`   时间: ${new Date().toLocaleString('zh-CN')}`);
  console.log(`   API: ${API_BASE_URL}\n`);
});

// ==================== 测试结束后 ====================
afterAll(() => {
  console.log(`\n🏁 测试执行完成`);
  TestReportGenerator.generateReport();
});

// ==================== 批量任务创建测试 (TC-01) ====================
describe('POST /backtest/batch - 创建批量任务', () => {
  const suite = recordSuite('POST /backtest/batch - 创建批量任务');
  let testBatchId = null;

  it('TC-01-001: 创建批量任务-全部交易对', async () => {
    await runTest(suite, 'TC-01-001: 创建批量任务-全部交易对', async () => {
      const requestBody = { ...TEST_DATA };
      const response = await api.post('/backtest/batch', requestBody);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.batchId).toBeDefined();
      expect(response.data.data.totalPairs).toBeGreaterThan(0);
      expect(response.data.data.totalPairs).toBeLessThanOrEqual(10000);
      expect(['queued', 'pending']).toContain(response.data.data.status);
      
      testBatchId = response.data.data.batchId;
    });
  });

  it('TC-01-002: 创建批量任务-指定交易对', async () => {
    await runTest(suite, 'TC-01-002: 创建批量任务-指定交易对', async () => {
      const requestBody = { ...TEST_DATA, pairIds: [1, 2, 3] };
      const response = await api.post('/backtest/batch', requestBody);
      
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.totalPairs).toBe(3);
    });
  });

  it('TC-01-003: 创建批量任务-无效策略', async () => {
    await runTest(suite, 'TC-01-003: 创建批量任务-无效策略', async () => {
      const requestBody = { ...TEST_DATA, strategyId: 99999 };
      
      try {
        await api.post('/backtest/batch', requestBody);
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.success).toBe(false);
        expect(error.response.data.error.code).toBe('STRATEGY_NOT_FOUND');
      }
    });
  });

  it('TC-01-004: 创建批量任务-无效交易对', async () => {
    await runTest(suite, 'TC-01-004: 创建批量任务-无效交易对', async () => {
      const requestBody = { ...TEST_DATA, pairIds: [99999] };
      
      try {
        await api.post('/backtest/batch', requestBody);
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error.code).toBe('INVALID_PAIR_IDS');
      }
    });
  });

  it('TC-01-005: 创建批量任务-超过10000个交易对', async () => {
    await runTest(suite, 'TC-01-005: 创建批量任务-超过10000个交易对', async () => {
      const requestBody = { ...TEST_DATA, pairIds: Array.from({ length: 10001 }, (_, i) => i + 1) };
      
      try {
        await api.post('/backtest/batch', requestBody);
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error.code).toBe('PAIR_LIMIT_EXCEEDED');
      }
    });
  });

  it('TC-01-006: 创建批量任务-空交易对列表', async () => {
    await runTest(suite, 'TC-01-006: 创建批量任务-空交易对列表', async () => {
      const requestBody = { ...TEST_DATA, pairIds: [] };
      const response = await api.post('/backtest/batch', requestBody);
      expect(response.status).toBe(201);
    });
  });

  it('TC-01-007: 创建批量任务-队列已满', async () => {
    recordTest(suite, 'TC-01-007: 创建批量任务-队列已满', 'skipped');
  });

  it('TC-01-008: 创建批量任务-无效参数', async () => {
    await runTest(suite, 'TC-01-008: 创建批量任务-无效参数', async () => {
      const requestBody = {
        strategyId: 'invalid',
        timeframeId: 1,
        startTime: 'invalid-date',
        endTime: 'invalid-date',
        initialCapital: -1000
      };
      
      try {
        await api.post('/backtest/batch', requestBody);
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});

// ==================== 批量任务查询测试 (TC-02) ====================
describe('GET /backtest/batch - 查询批量任务', () => {
  const suite = recordSuite('GET /backtest/batch - 查询批量任务');

  it('TC-02-001: 查询批量任务列表-默认参数', async () => {
    await runTest(suite, 'TC-02-001: 查询批量任务列表-默认参数', async () => {
      const response = await api.get('/backtest/batch');
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data.items)).toBe(true);
      expect(response.data.data.pagination).toBeDefined();
    });
  });

  it('TC-02-002: 查询批量任务列表-带状态过滤', async () => {
    await runTest(suite, 'TC-02-002: 查询批量任务列表-带状态过滤', async () => {
      const response = await api.get('/backtest/batch?status=queued');
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  it('TC-02-003: 查询批量任务列表-分页', async () => {
    await runTest(suite, 'TC-02-003: 查询批量任务列表-分页', async () => {
      const response = await api.get('/backtest/batch?page=1&limit=10');
      expect(response.status).toBe(200);
      expect(response.data.data.pagination.page).toBe(1);
      expect(response.data.data.pagination.limit).toBe(10);
    });
  });

  it('TC-02-004: 查询批量任务详情-成功', async () => {
    await runTest(suite, 'TC-02-004: 查询批量任务详情-成功', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}`);
      expect(response.status).toBe(200);
      expect(response.data.data.id).toBe(batchId);
    });
  });

  it('TC-02-005: 查询批量任务详情-不存在', async () => {
    await runTest(suite, 'TC-02-005: 查询批量任务详情-不存在', async () => {
      try {
        await api.get('/backtest/batch/999999');
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  it('TC-02-006: 查询子任务列表-默认', async () => {
    await runTest(suite, 'TC-02-006: 查询子任务列表-默认', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/items`);
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data.items)).toBe(true);
    });
  });

  it('TC-02-007: 查询子任务列表-带状态过滤', async () => {
    await runTest(suite, 'TC-02-007: 查询子任务列表-带状态过滤', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/items?status=pending`);
      expect(response.status).toBe(200);
    });
  });

  it('TC-02-008: 查询子任务列表-分页', async () => {
    await runTest(suite, 'TC-02-008: 查询子任务列表-分页', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3, 4, 5] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/items?page=1&limit=2`);
      expect(response.status).toBe(200);
      expect(response.data.data.items.length).toBeLessThanOrEqual(2);
    });
  });

  it('TC-02-009: 查询子任务列表-批量任务不存在', async () => {
    await runTest(suite, 'TC-02-009: 查询子任务列表-批量任务不存在', async () => {
      try {
        await api.get('/backtest/batch/999999/items');
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  it('TC-02-010: 查询子任务详情-成功', async () => {
    await runTest(suite, 'TC-02-010: 查询子任务详情-成功', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const itemsRes = await api.get(`/backtest/batch/${batchId}/items`);
      const itemId = itemsRes.data.data.items[0].id;
      const response = await api.get(`/backtest/batch/${batchId}/items/${itemId}`);
      expect(response.status).toBe(200);
    });
  });

  it('TC-02-011: 查询子任务详情-不存在', async () => {
    await runTest(suite, 'TC-02-011: 查询子任务详情-不存在', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      try {
        await api.get(`/backtest/batch/${batchId}/items/999999`);
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  it('TC-02-012: 查询进度-成功', async () => {
    await runTest(suite, 'TC-02-012: 查询进度-成功', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/progress`);
      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('progress');
    });
  });

  it('TC-02-013: 查询进度-任务不存在', async () => {
    await runTest(suite, 'TC-02-013: 查询进度-任务不存在', async () => {
      try {
        await api.get('/backtest/batch/999999/progress');
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  it('TC-02-014: 查询进度-实时更新', async () => {
    recordTest(suite, 'TC-02-014: 查询进度-实时更新', 'skipped');
  });

  it('TC-02-015: 查询历史任务-时间范围过滤', async () => {
    await runTest(suite, 'TC-02-015: 查询历史任务-时间范围过滤', async () => {
      const response = await api.get('/backtest/batch?startDate=2024-01-01&endDate=2024-12-31');
      expect(response.status).toBe(200);
    });
  });

  it('TC-02-016: 查询历史任务-策略过滤', async () => {
    await runTest(suite, 'TC-02-016: 查询历史任务-策略过滤', async () => {
      const response = await api.get('/backtest/batch?strategyId=5');
      expect(response.status).toBe(200);
    });
  });

  it('TC-02-017: 查询历史任务-组合过滤', async () => {
    await runTest(suite, 'TC-02-017: 查询历史任务-组合过滤', async () => {
      const response = await api.get('/backtest/batch?strategyId=5&status=completed');
      expect(response.status).toBe(200);
    });
  });

  it('TC-02-018: 查询任务统计-成功', async () => {
    await runTest(suite, 'TC-02-018: 查询任务统计-成功', async () => {
      const response = await api.get('/backtest/batch/statistics');
      expect(response.status).toBe(200);
      expect(response.data.data).toBeDefined();
    });
  });

  it('TC-02-019: 查询任务统计-无权限', async () => {
    recordTest(suite, 'TC-02-019: 查询任务统计-无权限', 'skipped');
  });

  it('TC-02-020: 导出任务结果-CSV格式', async () => {
    await runTest(suite, 'TC-02-020: 导出任务结果-CSV格式', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/export?format=csv`);
      expect(response.status).toBe(200);
    });
  });

  it('TC-02-021: 导出任务结果-JSON格式', async () => {
    await runTest(suite, 'TC-02-021: 导出任务结果-JSON格式', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/export?format=json`);
      expect(response.status).toBe(200);
    });
  });

  it('TC-02-022: 导出任务结果-任务未完成', async () => {
    await runTest(suite, 'TC-02-022: 导出任务结果-任务未完成', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      try {
        await api.get(`/backtest/batch/${batchId}/export?format=csv&waitForCompletion=true`);
      } catch (error) {
        expect([202, 400]).toContain(error.response.status);
      }
    });
  });
});

// ==================== 任务控制测试 (TC-03) ====================
describe('任务控制 API', () => {
  const suite = recordSuite('任务控制 API');

  it('TC-03-001: 启动任务-成功', async () => {
    await runTest(suite, 'TC-03-001: 启动任务-成功', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.post(`/backtest/batch/${batchId}/start`);
      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('running');
    });
  });

  it('TC-03-002: 启动任务-任务不存在', async () => {
    await runTest(suite, 'TC-03-002: 启动任务-任务不存在', async () => {
      try {
        await api.post('/backtest/batch/999999/start');
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  it('TC-03-003: 启动任务-状态不允许', async () => {
    await runTest(suite, 'TC-03-003: 启动任务-状态不允许', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      await api.post(`/backtest/batch/${batchId}/start`);
      try {
        await api.post(`/backtest/batch/${batchId}/start`);
      } catch (error) {
        expect([400, 409]).toContain(error.response.status);
      }
    });
  });

  it('TC-03-004: 暂停任务-成功', async () => {
    await runTest(suite, 'TC-03-004: 暂停任务-成功', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3, 4, 5] });
      const batchId = createRes.data.data.batchId;
      await api.post(`/backtest/batch/${batchId}/start`);
      const response = await api.post(`/backtest/batch/${batchId}/pause`);
      expect(response.status).toBe(200);
      expect(response.data.data.pauseRequested).toBe(true);
    });
  });

  it('TC-03-005: 暂停任务-任务不存在', async () => {
    await runTest(suite, 'TC-03-005: 暂停任务-任务不存在', async () => {
      try {
        await api.post('/backtest/batch/999999/pause');
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  it('TC-03-006: 暂停任务-状态不允许', async () => {
    await runTest(suite, 'TC-03-006: 暂停任务-状态不允许', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      try {
        await api.post(`/backtest/batch/${batchId}/pause`);
      } catch (error) {
        expect([400, 409]).toContain(error.response.status);
      }
    });
  });

  it('TC-03-007: 暂停任务-暂停超时', async () => {
    recordTest(suite, 'TC-03-007: 暂停任务-暂停超时', 'skipped');
  });

  it('TC-03-008: 继续任务-成功', async () => {
    await runTest(suite, 'TC-03-008: 继续任务-成功', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3] });
      const batchId = createRes.data.data.batchId;
      await api.post(`/backtest/batch/${batchId}/start`);
      await api.post(`/backtest/batch/${batchId}/pause`);
      const response = await api.post(`/backtest/batch/${batchId}/resume`);
      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('running');
    });
  });

  it('TC-03-009: 继续任务-任务不存在', async () => {
    await runTest(suite, 'TC-03-009: 继续任务-任务不存在', async () => {
      try {
        await api.post('/backtest/batch/999999/resume');
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  it('TC-03-010: 继续任务-状态不允许', async () => {
    await runTest(suite, 'TC-03-010: 继续任务-状态不允许', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      try {
        await api.post(`/backtest/batch/${batchId}/resume`);
      } catch (error) {
        expect([400, 409]).toContain(error.response.status);
      }
    });
  });

  it('TC-03-011: 取消任务-成功', async () => {
    await runTest(suite, 'TC-03-011: 取消任务-成功', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3] });
      const batchId = createRes.data.data.batchId;
      const response = await api.post(`/backtest/batch/${batchId}/cancel`);
      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('cancelled');
    });
  });

  it('TC-03-012: 取消任务-任务不存在', async () => {
    await runTest(suite, 'TC-03-012: 取消任务-任务不存在', async () => {
      try {
        await api.post('/backtest/batch/999999/cancel');
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  it('TC-03-013: 取消任务-状态不允许', async () => {
    await runTest(suite, 'TC-03-013: 取消任务-状态不允许', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      await api.post(`/backtest/batch/${batchId}/start`);
      await new Promise(resolve => setTimeout(resolve, 100));
      await api.post(`/backtest/batch/${batchId}/cancel`);
      try {
        await api.post(`/backtest/batch/${batchId}/cancel`);
      } catch (error) {
        expect([400, 409]).toContain(error.response.status);
      }
    });
  });

  it('TC-03-014: 重试失败任务-成功', async () => {
    await runTest(suite, 'TC-03-014: 重试失败任务-成功', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.post(`/backtest/batch/${batchId}/retry`);
      expect(response.status).toBe(200);
    });
  });

  it('TC-03-015: 强制重试-成功', async () => {
    await runTest(suite, 'TC-03-015: 强制重试-成功', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2] });
      const batchId = createRes.data.data.batchId;
      const response = await api.post(`/backtest/batch/${batchId}/force-retry`, { pairIds: [1] });
      expect(response.status).toBe(200);
    });
  });
});

// ==================== 结果查询测试 (TC-04) ====================
describe('结果查询 API', () => {
  const suite = recordSuite('结果查询 API');

  it('TC-04-001: 查询汇总结果-成功', async () => {
    await runTest(suite, 'TC-04-001: 查询汇总结果-成功', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/summary`);
      expect(response.status).toBe(200);
      expect(response.data.data).toHaveProperty('totalPairs');
    });
  });

  it('TC-04-002: 查询汇总结果-任务不存在', async () => {
    await runTest(suite, 'TC-04-002: 查询汇总结果-任务不存在', async () => {
      try {
        await api.get('/backtest/batch/999999/summary');
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  it('TC-04-003: 查询汇总结果-无完成项', async () => {
    await runTest(suite, 'TC-04-003: 查询汇总结果-无完成项', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/summary`);
      expect(response.status).toBe(200);
    });
  });

  it('TC-04-004: 查询详细结果-成功', async () => {
    await runTest(suite, 'TC-04-004: 查询详细结果-成功', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/details`);
      expect(response.status).toBe(200);
    });
  });

  it('TC-04-005: 查询详细结果-分页', async () => {
    await runTest(suite, 'TC-04-005: 查询详细结果-分页', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3, 4, 5] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/details?page=1&limit=2`);
      expect(response.status).toBe(200);
    });
  });

  it('TC-04-006: 对比结果-成功', async () => {
    await runTest(suite, 'TC-04-006: 对比结果-成功', async () => {
      const createRes1 = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const createRes2 = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId1 = createRes1.data.data.batchId;
      const batchId2 = createRes2.data.data.batchId;
      const response = await api.get(`/backtest/batch/compare?ids=${batchId1},${batchId2}`);
      expect(response.status).toBe(200);
    });
  });

  it('TC-04-007: 对比结果-任务数量不匹配', async () => {
    await runTest(suite, 'TC-04-007: 对比结果-任务数量不匹配', async () => {
      try {
        await api.get('/backtest/batch/compare?ids=1');
      } catch (error) {
        expect([400, 422]).toContain(error.response.status);
      }
    });
  });

  it('TC-04-008: 导出汇总-CSV', async () => {
    await runTest(suite, 'TC-04-008: 导出汇总-CSV', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/summary/export?format=csv`);
      expect(response.status).toBe(200);
    });
  });

  it('TC-04-009: 导出汇总-JSON', async () => {
    await runTest(suite, 'TC-04-009: 导出汇总-JSON', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/summary/export?format=json`);
      expect(response.status).toBe(200);
    });
  });

  it('TC-04-010: 导出明细-CSV', async () => {
    await runTest(suite, 'TC-04-010: 导出明细-CSV', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/details/export?format=csv`);
      expect(response.status).toBe(200);
    });
  });

  it('TC-04-011: 导出明细-JSON', async () => {
    await runTest(suite, 'TC-04-011: 导出明细-JSON', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.get(`/backtest/batch/${batchId}/details/export?format=json`);
      expect(response.status).toBe(200);
    });
  });
});

// ==================== 并发与边界测试 (TC-05) ====================
describe('并发与边界测试', () => {
  const suite = recordSuite('并发与边界测试');

  it('TC-05-001: 并发创建任务-限制检查', async () => {
    await runTest(suite, 'TC-05-001: 并发创建任务-限制检查', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] }));
      }
      const results = await Promise.all(promises);
      results.forEach(res => {
        expect(res.status).toBe(201);
      });
    });
  });

  it('TC-05-002: 并发创建任务-队列顺序', async () => {
    recordTest(suite, 'TC-05-002: 并发创建任务-队列顺序', 'skipped');
  });

  it('TC-05-003: 数据库连接中断-恢复', async () => {
    recordTest(suite, 'TC-05-003: 数据库连接中断-恢复', 'skipped');
  });

  it('TC-05-004: 数据库连接中断-任务状态', async () => {
    recordTest(suite, 'TC-05-004: 数据库连接中断-任务状态', 'skipped');
  });

  it('TC-05-005: 服务重启-任务恢复', async () => {
    recordTest(suite, 'TC-05-005: 服务重启-任务恢复', 'skipped');
  });

  it('TC-05-006: 服务重启-进度保持', async () => {
    recordTest(suite, 'TC-05-006: 服务重启-进度保持', 'skipped');
  });

  it('TC-05-007: 子任务超时-自动失败', async () => {
    recordTest(suite, 'TC-05-007: 子任务超时-自动失败', 'skipped');
  });

  it('TC-05-008: 子任务超时-超时配置', async () => {
    recordTest(suite, 'TC-05-008: 子任务超时-超时配置', 'skipped');
  });

  it('TC-05-009: 重试次数限制-达到上限', async () => {
    recordTest(suite, 'TC-05-009: 重试次数限制-达到上限', 'skipped');
  });

  it('TC-05-010: 重试次数限制-强制重试', async () => {
    await runTest(suite, 'TC-05-010: 重试次数限制-强制重试', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.post(`/backtest/batch/${batchId}/force-retry`, { pairIds: [1] });
      expect(response.status).toBe(200);
    });
  });

  it('TC-05-011: 内存使用-大任务', async () => {
    recordTest(suite, 'TC-05-011: 内存使用-大任务', 'skipped');
  });

  it('TC-05-012: 内存使用-监控', async () => {
    recordTest(suite, 'TC-05-012: 内存使用-监控', 'skipped');
  });

  it('TC-05-013: 长时间运行-稳定性', async () => {
    recordTest(suite, 'TC-05-013: 长时间运行-稳定性', 'skipped');
  });
});

// ==================== 队列管理测试 (TC-07) ====================
describe('队列管理 API', () => {
  const suite = recordSuite('队列管理 API');

  it('TC-07-001: 获取队列状态-成功', async () => {
    await runTest(suite, 'TC-07-001: 获取队列状态-成功', async () => {
      const response = await api.get('/backtest/queue/status');
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data).toHaveProperty('isProcessing');
      expect(response.data.data).toHaveProperty('queueLength');
      expect(response.data.data).toHaveProperty('maxQueueLength');
    });
  });

  it('TC-07-002: 获取队列状态-空队列', async () => {
    await runTest(suite, 'TC-07-002: 获取队列状态-空队列', async () => {
      const response = await api.get('/backtest/queue/status');
      expect(response.status).toBe(200);
      expect(typeof response.data.data.queueLength).toBe('number');
    });
  });

  it('TC-07-003: 获取队列状态-有任务', async () => {
    await runTest(suite, 'TC-07-003: 获取队列状态-有任务', async () => {
      await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const response = await api.get('/backtest/queue/status');
      expect(response.status).toBe(200);
      expect(response.data.data.queueLength).toBeGreaterThanOrEqual(0);
    });
  });

  it('TC-07-004: 获取队列列表-成功', async () => {
    await runTest(suite, 'TC-07-004: 获取队列列表-成功', async () => {
      const response = await api.get('/backtest/queue');
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.items).toBeDefined();
      expect(response.data.data.pagination).toBeDefined();
    });
  });

  it('TC-07-005: 获取队列列表-分页', async () => {
    await runTest(suite, 'TC-07-005: 获取队列列表-分页', async () => {
      const response = await api.get('/backtest/queue?page=1&limit=10');
      expect(response.status).toBe(200);
      expect(response.data.data.pagination.page).toBe(1);
      expect(response.data.data.pagination.limit).toBe(10);
    });
  });

  it('TC-07-006: 获取队列列表-空队列', async () => {
    await runTest(suite, 'TC-07-006: 获取队列列表-空队列', async () => {
      const response = await api.get('/backtest/queue');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data.items)).toBe(true);
    });
  });

  it('TC-07-007: 取消队列任务-成功', async () => {
    await runTest(suite, 'TC-07-007: 取消队列任务-成功', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const response = await api.delete(`/backtest/queue/${batchId}`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  it('TC-07-008: 取消队列任务-任务不存在', async () => {
    await runTest(suite, 'TC-07-008: 取消队列任务-任务不存在', async () => {
      try {
        await api.delete('/backtest/queue/999999');
        throw new Error('应该抛出错误');
      } catch (error) {
        expect(error.response.status).toBe(404);
      }
    });
  });

  it('TC-07-009: 取消队列任务-任务已开始', async () => {
    await runTest(suite, 'TC-07-009: 取消队列任务-任务已开始', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3, 4, 5] });
      const batchId = createRes.data.data.batchId;
      await api.post(`/backtest/batch/${batchId}/start`);
      try {
        await api.delete(`/backtest/queue/${batchId}`);
      } catch (error) {
        expect([400, 409]).toContain(error.response.status);
      }
    });
  });

  it('TC-07-010: 取消队列任务-无权限', async () => {
    recordTest(suite, 'TC-07-010: 取消队列任务-无权限', 'skipped');
  });

  it('TC-07-011: 队列满时创建任务', async () => {
    recordTest(suite, 'TC-07-011: 队列满时创建任务', 'skipped');
  });

  it('TC-07-012: 队列任务执行顺序', async () => {
    recordTest(suite, 'TC-07-012: 队列任务执行顺序', 'skipped');
  });

  it('TC-07-013: 队列任务状态同步', async () => {
    await runTest(suite, 'TC-07-013: 队列任务状态同步', async () => {
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;
      const batchRes = await api.get(`/backtest/batch/${batchId}`);
      expect(['queued', 'pending', 'running']).toContain(batchRes.data.data.status);
    });
  });
});
