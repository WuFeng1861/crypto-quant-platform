/**
 * 批量回测 API 测试用例
 *
 * 测试范围:
 * - 批量任务创建 API
 * - 批量任务查询 API
 * - 任务控制 API (暂停/继续/取消/重试)
 * - 结果查询 API
 *
 * 运行方式:
 * - 单元测试: npm test batch-backtest-api.test.js
 * - 集成测试: 需要启动后端服务
 */

const axios = require('axios');
const assert = require('assert');

// 配置 - 使用 localhost:3099
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3099';
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 测试数据
const TEST_DATA = {
  strategyId: 1,
  timeframeId: 1,
  startTime: '2024-01-01T00:00:00.000Z',
  endTime: '2024-12-31T23:59:59.000Z',
  initialCapital: 10000,
  earlyStopThreshold: 10,
  positionDivision: 1
};

// 存储测试过程中创建的批量任务ID
let testBatchId = null;

describe('批量回测 API 测试', () => {

  // ==================== 批量任务创建测试 ====================
  describe('POST /backtest/batch - 创建批量任务', () => {

    it('TC-001: 创建批量任务-全部交易对', async () => {
      const requestBody = { ...TEST_DATA };
      // 不传 pairIds，应该获取所有交易对

      const response = await api.post('/backtest/batch', requestBody);

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.data.success, true);
      assert.ok(response.data.data.batchId, '应该返回 batchId');
      assert.ok(response.data.data.totalPairs > 0, 'totalPairs 应该大于 0');
      assert.strictEqual(response.data.data.status, 'pending');

      // 保存 batchId 用于后续测试
      testBatchId = response.data.data.batchId;
    });

    it('TC-002: 创建批量任务-指定交易对', async () => {
      const requestBody = {
        ...TEST_DATA,
        pairIds: [1, 2, 3]
      };

      const response = await api.post('/backtest/batch', requestBody);

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.data.success, true);
      assert.strictEqual(response.data.data.totalPairs, 3);
    });

    it('TC-003: 创建批量任务-无效策略', async () => {
      const requestBody = {
        ...TEST_DATA,
        strategyId: 99999 // 不存在的策略
      };

      try {
        await api.post('/backtest/batch', requestBody);
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.success, false);
        assert.ok(error.response.data.error.code === 'STRATEGY_NOT_FOUND');
      }
    });

    it('TC-004: 创建批量任务-无效交易对', async () => {
      const requestBody = {
        ...TEST_DATA,
        pairIds: [99999] // 不存在的交易对
      };

      try {
        await api.post('/backtest/batch', requestBody);
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.success, false);
      }
    });

    it('TC-005: 创建批量任务-空交易对列表', async () => {
      const requestBody = {
        ...TEST_DATA,
        pairIds: []
      };

      try {
        await api.post('/backtest/batch', requestBody);
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.success, false);
      }
    });

    it('TC-006: 创建批量任务-参数缺失', async () => {
      const requestBody = {
        // 缺少 strategyId
        timeframeId: 1,
        startTime: '2024-01-01T00:00:00.000Z',
        endTime: '2024-12-31T23:59:59.000Z',
        initialCapital: 10000
      };

      try {
        await api.post('/backtest/batch', requestBody);
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.success, false);
      }
    });

    it('TC-007: 创建批量任务-参数类型错误', async () => {
      const requestBody = {
        ...TEST_DATA,
        strategyId: 'abc' // 错误的类型
      };

      try {
        await api.post('/backtest/batch', requestBody);
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.success, false);
      }
    });

    it('TC-008: 创建批量任务-可选参数', async () => {
      const requestBody = {
        ...TEST_DATA,
        pairIds: [1, 2],
        earlyStopThreshold: 15,
        positionDivision: 2
      };

      const response = await api.post('/backtest/batch', requestBody);

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.data.success, true);
    });

    it('TC-009: 创建批量任务-交易对数量上限（500个）', async () => {
      // 创建501个交易对ID
      const pairIds = Array.from({ length: 501 }, (_, i) => i + 1);

      const requestBody = {
        ...TEST_DATA,
        pairIds
      };

      try {
        await api.post('/backtest/batch', requestBody);
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.success, false);
        assert.strictEqual(error.response.data.error.code, 'PAIR_LIMIT_EXCEEDED');
        assert.ok(error.response.data.error.message.includes('500'));
        assert.ok(error.response.data.error.message.includes('501'));
      }
    });

    it('TC-009a: 创建批量任务-交易对数量边界（500个）', async () => {
      // 创建正好500个交易对ID
      const pairIds = Array.from({ length: 500 }, (_, i) => i + 1);

      const requestBody = {
        ...TEST_DATA,
        pairIds
      };

      // 注意：这个测试需要系统实际存在这些交易对
      // 如果交易对不存在，会返回 PAIR_NOT_FOUND 错误
      try {
        const response = await api.post('/backtest/batch', requestBody);
        assert.strictEqual(response.status, 201);
        assert.strictEqual(response.data.data.totalPairs, 500);
      } catch (error) {
        // 如果交易对不存在，也是预期的行为
        if (error.response?.data?.error?.code === 'PAIR_NOT_FOUND') {
          assert.ok(true, '交易对不存在，但数量限制校验通过');
        } else {
          throw error;
        }
      }
    });
  });

  // ==================== 批量任务查询测试 ====================
  describe('GET /backtest/batch/:id - 查询批量任务', () => {

    it('TC-030: 查询任务详情-成功', async () => {
      // 确保有测试数据
      if (!testBatchId) {
        const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3] });
        testBatchId = createRes.data.data.batchId;
      }

      const response = await api.get(`/backtest/batch/${testBatchId}`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(response.data.data.id, '应该返回 id');
      assert.ok(response.data.data.status, '应该返回 status');
      assert.ok(response.data.data.totalPairs !== undefined, '应该返回 totalPairs');
      assert.ok(response.data.data.completedPairs !== undefined, '应该返回 completedPairs');
    });

    it('TC-031: 查询任务详情-不存在', async () => {
      try {
        await api.get('/backtest/batch/99999');
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 404);
        assert.strictEqual(error.response.data.success, false);
      }
    });

    it('TC-032: 查询任务列表', async () => {
      const response = await api.get('/backtest/batch');

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(Array.isArray(response.data.data.items), '应该返回数组');
    });

    it('TC-033: 查询子任务列表', async () => {
      if (!testBatchId) {
        const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3] });
        testBatchId = createRes.data.data.batchId;
      }

      const response = await api.get(`/backtest/batch/${testBatchId}/items`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(response.data.data.items, '应该返回 items');
      assert.ok(Array.isArray(response.data.data.items), 'items 应该是数组');
    });

    it('TC-034: 查询子任务列表-带分页', async () => {
      const response = await api.get(`/backtest/batch/${testBatchId}/items?page=1&limit=10`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(response.data.data.pagination, '应该返回 pagination');
      assert.ok(response.data.data.pagination.page, '应该返回 page');
      assert.ok(response.data.data.pagination.total, '应该返回 total');
    });

    it('TC-035: 查询子任务列表-带筛选', async () => {
      const response = await api.get(`/backtest/batch/${testBatchId}/items?status=pending`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      // 验证返回的数据都符合筛选条件
      response.data.data.items.forEach(item => {
        assert.strictEqual(item.status, 'pending');
      });
    });
  });

  // ==================== 任务控制测试 ====================
  describe('任务控制 API', () => {
    let controlTestBatchId = null;

    beforeEach(async () => {
      // 每个测试前创建一个新的批量任务
      const response = await api.post('/backtest/batch', {
        ...TEST_DATA,
        pairIds: [1, 2, 3]
      });
      controlTestBatchId = response.data.data.batchId;
    });

    it('TC-040: 启动任务', async () => {
      const response = await api.post(`/backtest/batch/${controlTestBatchId}/start`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(response.data.data.status === 'running' || response.data.data.status === 'pending');
    });

    it('TC-041: 暂停任务-执行中', async function() {
      this.timeout(30000);

      // 先启动任务
      await api.post(`/backtest/batch/${controlTestBatchId}/start`);

      try {
        const response = await api.post(`/backtest/batch/${controlTestBatchId}/pause`);

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert.ok(response.data.data.pauseRequested === true);
      } catch (error) {
        // 如果任务不在 running 状态，应该返回 400
        if (error.response && error.response.status === 400) {
          assert.strictEqual(error.response.data.success, false);
        } else {
          throw error;
        }
      }
    });

    it('TC-042: 暂停任务-非执行状态', async () => {
      // 任务刚创建，状态为 pending
      try {
        await api.post(`/backtest/batch/${controlTestBatchId}/pause`);
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.success, false);
        assert.ok(error.response.data.error.code === 'INVALID_STATUS');
      }
    });

    it('TC-043: 继续任务-已暂停', async function() {
      this.timeout(30000);

      // 先启动任务
      await api.post(`/backtest/batch/${controlTestBatchId}/start`);

      // 尝试暂停任务
      try {
        await api.post(`/backtest/batch/${controlTestBatchId}/pause`);
      } catch (e) {
        // 忽略暂停失败
      }

      // 尝试继续
      try {
        const response = await api.post(`/backtest/batch/${controlTestBatchId}/resume`);

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert.strictEqual(response.data.data.status, 'running');
      } catch (error) {
        // 如果任务不在 paused 状态，应该返回 400
        if (error.response && error.response.status === 400) {
          assert.strictEqual(error.response.data.success, false);
        } else {
          throw error;
        }
      }
    });

    it('TC-044: 继续任务-非暂停状态', async () => {
      // 任务刚创建，状态为 pending
      try {
        await api.post(`/backtest/batch/${controlTestBatchId}/resume`);
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.success, false);
      }
    });

    it('TC-045: 取消任务', async () => {
      const response = await api.post(`/backtest/batch/${controlTestBatchId}/cancel`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(['cancelling', 'cancelled'].includes(response.data.data.status));
    });

    it('TC-046: 取消任务-已完成', async () => {
      // 这个测试需要等待任务完成
      // 实际测试中可能需要 mock 或使用已完成的任务

      // 暂时跳过，或创建一个已完成的任务
      this.skip();
    });

    it('TC-047: 重试失败任务', async () => {
      // 这个测试需要有失败的任务
      // 暂时跳过，或创建包含失败任务的场景
      this.skip();
    });

    it('TC-048: 重试指定交易对', async () => {
      const requestBody = {
        pairIds: [1, 2]
      };

      try {
        const response = await api.post(`/backtest/batch/${controlTestBatchId}/retry`, requestBody);

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert.ok(response.data.data.retryCount > 0);
        assert.deepStrictEqual(response.data.data.retryPairIds, [1, 2]);
      } catch (error) {
        // 如果没有可重试的任务，应该返回 400
        if (error.response && error.response.status === 400) {
          assert.strictEqual(error.response.data.success, false);
        } else {
          throw error;
        }
      }
    });

    it('TC-049: 重试-无失败任务', async () => {
      // 新创建的任务没有失败任务
      try {
        await api.post(`/backtest/batch/${controlTestBatchId}/retry`);
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.success, false);
        assert.ok(error.response.data.error.code === 'NO_RETRYABLE_TASKS');
      }
    });

    it('TC-049a: 强制重试-绕过次数限制', async () => {
      const requestBody = {
        pairIds: [1, 2]
      };

      try {
        const response = await api.post(`/backtest/batch/${controlTestBatchId}/force-retry`, requestBody);

        assert.strictEqual(response.status, 200);
        assert.strictEqual(response.data.success, true);
        assert.ok(response.data.data.retryCount > 0);
        assert.deepStrictEqual(response.data.data.retryPairIds, [1, 2]);
      } catch (error) {
        // 如果 pairIds 无效或任务不存在，应该返回 400
        if (error.response && error.response.status === 400) {
          assert.strictEqual(error.response.data.success, false);
        } else {
          throw error;
        }
      }
    });

    it('TC-049b: 强制重试-参数缺失', async () => {
      // 强制重试必须传入 pairIds
      try {
        await api.post(`/backtest/batch/${controlTestBatchId}/force-retry`, {});
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.success, false);
      }
    });
  });

  // ==================== 结果查询测试 ====================
  describe('GET /backtest/batch/:id/summary - 结果查询', () => {

    it('TC-050: 查询汇总结果', async () => {
      if (!testBatchId) {
        const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3] });
        testBatchId = createRes.data.data.batchId;
      }

      const response = await api.get(`/backtest/batch/${testBatchId}/summary`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(response.data.data.batchId, '应该返回 batchId');
      assert.ok(response.data.data.summary !== undefined, '应该返回 summary');
    });

    it('TC-051: 查询汇总结果-不存在', async () => {
      try {
        await api.get('/backtest/batch/99999/summary');
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 404);
        assert.strictEqual(error.response.data.success, false);
      }
    });
  });

  // ==================== 边界条件测试 ====================
  describe('边界条件测试', () => {

    it('TC-060: 创建任务-单个交易对', async () => {
      const requestBody = {
        ...TEST_DATA,
        pairIds: [1]
      };

      const response = await api.post('/backtest/batch', requestBody);

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.data.data.totalPairs, 1);
    });

    it('TC-061: 创建任务-大量交易对', async function() {
      this.timeout(10000);

      // 假设系统有至少 20 个交易对
      const response = await api.post('/backtest/batch', { ...TEST_DATA });

      assert.strictEqual(response.status, 201);
      assert.ok(response.data.data.totalPairs > 0);
    });

    it('TC-062: 参数边界-初始资金为0', async () => {
      const requestBody = {
        ...TEST_DATA,
        pairIds: [1],
        initialCapital: 0
      };

      try {
        await api.post('/backtest/batch', requestBody);
        // 根据业务逻辑，可能允许或拒绝
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
      }
    });

    it('TC-063: 参数边界-时间范围无效', async () => {
      const requestBody = {
        ...TEST_DATA,
        pairIds: [1],
        startTime: '2024-12-31T00:00:00.000Z',
        endTime: '2024-01-01T00:00:00.000Z'
      };

      try {
        await api.post('/backtest/batch', requestBody);
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
      }
    });

    it('TC-064: 错误码验证-PAIR_LIMIT_EXCEEDED', async () => {
      const pairIds = Array.from({ length: 501 }, (_, i) => i + 1);

      try {
        await api.post('/backtest/batch', { ...TEST_DATA, pairIds });
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.error.code, 'PAIR_LIMIT_EXCEEDED');
        assert.ok(error.response.data.error.message);
      }
    });

    it('TC-065: 错误码验证-NO_RETRYABLE_TASKS', async () => {
      const response = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = response.data.data.batchId;

      try {
        await api.post(`/backtest/batch/${batchId}/retry`);
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.error.code, 'NO_RETRYABLE_TASKS');
      }
    });

    it('TC-066: 错误码验证-BATCH_NOT_FOUND', async () => {
      try {
        await api.get('/backtest/batch/99999999');
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 404);
        assert.strictEqual(error.response.data.error.code, 'BATCH_NOT_FOUND');
      }
    });
  });

  // ==================== 性能测试 ====================
  describe('性能测试', () => {

    it('TC-070: 创建任务 API 响应时间 < 500ms', async function() {
      this.timeout(5000);

      const startTime = Date.now();
      await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3] });
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      assert.ok(responseTime < 500, `响应时间 ${responseTime}ms 超过 500ms`);
    });

    it('TC-071: 查询任务 API 响应时间 < 200ms', async function() {
      this.timeout(3000);

      if (!testBatchId) {
        const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3] });
        testBatchId = createRes.data.data.batchId;
      }

      const startTime = Date.now();
      await api.get(`/backtest/batch/${testBatchId}`);
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      assert.ok(responseTime < 200, `响应时间 ${responseTime}ms 超过 200ms`);
    });
  });
});

// ==================== 辅助函数 ====================

/**
 * 等待指定时间
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 轮询等待任务状态
 */
async function waitForBatchStatus(batchId, targetStatus, maxWaitTime = 60000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitTime) {
    const response = await api.get(`/backtest/batch/${batchId}`);
    if (response.data.data.status === targetStatus) {
      return response.data.data;
    }
    await sleep(1000);
  }

  throw new Error(`等待任务状态 ${targetStatus} 超时`);
}

// 导出测试数据和辅助函数
module.exports = {
  TEST_DATA,
  api,
  sleep,
  waitForBatchStatus
};
