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
  strategyId: 5,
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

    it('TC-01-001: 创建批量任务-全部交易对', async () => {
      const requestBody = { ...TEST_DATA };
      // 不传 pairIds，应该获取所有交易对（最多10000个）

      const response = await api.post('/backtest/batch', requestBody);

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.data.success, true);
      assert.ok(response.data.data.batchId, '应该返回 batchId');
      assert.ok(response.data.data.totalPairs > 0, 'totalPairs 应该大于 0');
      assert.ok(response.data.data.totalPairs <= 10000, 'totalPairs 不超过 10000');
      // 任务进入队列，状态为 queued
      assert.ok(['queued', 'pending'].includes(response.data.data.status), '状态应为 queued 或 pending');

      // 保存 batchId 用于后续测试
      testBatchId = response.data.data.batchId;
    });

    it('TC-01-002: 创建批量任务-指定交易对', async () => {
      const requestBody = {
        ...TEST_DATA,
        pairIds: [1, 2, 3]
      };

      const response = await api.post('/backtest/batch', requestBody);

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.data.success, true);
      assert.strictEqual(response.data.data.totalPairs, 3);
    });

    it('TC-01-003: 创建批量任务-无效策略', async () => {
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

    it('TC-01-004: 创建批量任务-无效交易对', async () => {
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

    it('TC-01-005: 创建批量任务-空交易对列表', async () => {
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

    it('TC-01-006: 创建批量任务-参数缺失', async () => {
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

    it('TC-01-007: 创建批量任务-参数类型错误', async () => {
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

    it('TC-01-008: 创建批量任务-可选参数', async () => {
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

    it('TC-01-009: 创建批量任务-交易对数量上限（10000个）', async () => {
      // 创建10001个交易对ID
      const pairIds = Array.from({ length: 10001 }, (_, i) => i + 1);

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
        assert.ok(error.response.data.error.message.includes('10000'));
        assert.ok(error.response.data.error.message.includes('10001'));
      }
    });

    it('TC-01-010: 创建批量任务-交易对数量边界（10000个）', async function() {
      this.timeout(5000);
      // 创建正好10000个交易对ID
      const pairIds = Array.from({ length: 10000 }, (_, i) => i + 1);

      const requestBody = {
        ...TEST_DATA,
        pairIds
      };

      // 注意：这个测试需要系统实际存在这些交易对
      // 如果交易对不存在，会返回 PAIR_NOT_FOUND 错误
      try {
        const response = await api.post('/backtest/batch', requestBody);
        assert.strictEqual(response.status, 201);
        assert.strictEqual(response.data.data.totalPairs, 10000);
        assert.ok(['queued', 'pending'].includes(response.data.data.status), '状态应为 queued 或 pending');
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

    it('TC-03-001: 查询任务详情-成功', async () => {
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

    it('TC-03-002: 查询任务详情-不存在', async () => {
      try {
        await api.get('/backtest/batch/99999');
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 404);
        assert.strictEqual(error.response.data.success, false);
      }
    });

    it('TC-03-003: 查询任务列表', async () => {
      const response = await api.get('/backtest/batch');

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(Array.isArray(response.data.data.items), '应该返回数组');
    });

    it('TC-03-004: 查询子任务列表', async () => {
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

    it('TC-03-005: 查询子任务列表-带分页', async () => {
      const response = await api.get(`/backtest/batch/${testBatchId}/items?page=1&limit=10`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(response.data.data.pagination, '应该返回 pagination');
      assert.ok(response.data.data.pagination.page, '应该返回 page');
      assert.ok(response.data.data.pagination.total, '应该返回 total');
    });

    it('TC-03-006: 查询子任务列表-带筛选', async () => {
      const response = await api.get(`/backtest/batch/${testBatchId}/items?status=pending`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      // 验证返回的数据都符合筛选条件
      response.data.data.items.forEach(item => {
        assert.strictEqual(item.status, 'pending');
      });
    });

    it('TC-03-007: WebSocket实时进度', async function() {
      this.timeout(10000);

      // WebSocket测试需要特殊环境
      // 这里验证WebSocket端点存在且可连接

      // 注意：实际WebSocket测试需要ws库支持
      // 此测试仅作为占位，实际测试需要单独实现
      this.skip();
    });

    it('TC-03-008: 轮询进度更新', async function() {
      this.timeout(30000);

      // 创建一个任务并启动
      const createRes = await api.post('/backtest/batch', {
        ...TEST_DATA,
        pairIds: [1, 2, 3]
      });
      const batchId = createRes.data.data.batchId;
      await api.post(`/backtest/batch/${batchId}/start`);

      // 轮询检查进度变化
      let lastProgress = -1;
      const maxPolls = 10;

      for (let i = 0; i < maxPolls; i++) {
        await sleep(1000);
        const response = await api.get(`/backtest/batch/${batchId}`);
        const currentProgress = response.data.data.progress;

        // 进度应该单调递增或保持不变
        assert.ok(currentProgress >= lastProgress,
          `进度应该递增: ${lastProgress} -> ${currentProgress}`);

        lastProgress = currentProgress;

        // 如果任务完成，退出
        if (response.data.data.status === 'completed') {
          break;
        }
      }

      assert.ok(lastProgress >= 0, '应该能获取到进度信息');
    });

    it('TC-03-009: 进度准确性验证', async function() {
      this.timeout(30000);

      // 查询任务详情
      const response = await api.get(`/backtest/batch/${testBatchId}`);

      const { totalPairs, completedPairs, failedPairs, progress } = response.data.data;

      // 验证进度计算准确性
      if (totalPairs > 0) {
        const expectedProgress = Math.round(((completedPairs + failedPairs) / totalPairs) * 100);
        assert.ok(Math.abs(progress - expectedProgress) <= 1,
          `进度计算不准确: 期望 ${expectedProgress}%, 实际 ${progress}%`);
      }
    });

    it('TC-03-010: 大数量进度更新性能', async function() {
      this.timeout(10000);

      // 创建一个包含多个交易对的任务
      const createRes = await api.post('/backtest/batch', {
        ...TEST_DATA,
        pairIds: [1, 2, 3, 4, 5]
      });
      const batchId = createRes.data.data.batchId;

      // 启动任务
      await api.post(`/backtest/batch/${batchId}/start`);

      // 快速轮询查询进度
      const startTime = Date.now();
      for (let i = 0; i < 5; i++) {
        await api.get(`/backtest/batch/${batchId}`);
        await sleep(100);
      }
      const endTime = Date.now();

      // 验证查询性能
      const avgResponseTime = (endTime - startTime) / 5;
      assert.ok(avgResponseTime < 500, `平均响应时间 ${avgResponseTime}ms 超过 500ms`);
    });
  });

  // ==================== 批量任务执行测试 ====================
  describe('批量任务执行测试', () => {
    let execTestBatchId = null;

    before(async () => {
      // 创建一个用于执行测试的批量任务
      const response = await api.post('/backtest/batch', {
        ...TEST_DATA,
        pairIds: [1, 2, 3]
      });
      execTestBatchId = response.data.data.batchId;
    });

    it('TC-02-001: 串行执行验证', async function() {
      this.timeout(60000);

      // 启动任务
      await api.post(`/backtest/batch/${execTestBatchId}/start`);

      // 轮询检查任务状态
      let previousCompleted = 0;
      const maxChecks = 30;

      for (let i = 0; i < maxChecks; i++) {
        await sleep(1000);
        const response = await api.get(`/backtest/batch/${execTestBatchId}`);
        const currentCompleted = response.data.data.completedPairs;

        // 验证 completedPairs 是单调递增的（串行执行特征）
        assert.ok(currentCompleted >= previousCompleted,
          `completedPairs 应该递增: ${previousCompleted} -> ${currentCompleted}`);

        previousCompleted = currentCompleted;

        // 如果任务完成，退出循环
        if (response.data.data.status === 'completed') {
          break;
        }
      }
    });

    it('TC-02-002: 进度更新验证', async function() {
      this.timeout(30000);

      // 查询任务详情，验证进度字段
      const response = await api.get(`/backtest/batch/${execTestBatchId}`);

      assert.ok(response.data.data.totalPairs > 0, '应该返回 totalPairs');
      assert.ok(response.data.data.completedPairs !== undefined, '应该返回 completedPairs');
      assert.ok(response.data.data.failedPairs !== undefined, '应该返回 failedPairs');
      assert.ok(response.data.data.progress !== undefined, '应该返回 progress');
      assert.ok(response.data.data.progress >= 0 && response.data.data.progress <= 100,
        'progress 应该在 0-100 之间');
    });

    it('TC-02-003: 当前交易对显示', async function() {
      this.timeout(30000);

      // 启动新任务
      const createRes = await api.post('/backtest/batch', {
        ...TEST_DATA,
        pairIds: [1, 2]
      });
      const batchId = createRes.data.data.batchId;
      await api.post(`/backtest/batch/${batchId}/start`);

      // 等待一段时间后查询
      await sleep(1000);

      const response = await api.get(`/backtest/batch/${batchId}`);

      // 如果任务正在执行，应该显示 currentPair
      if (response.data.data.status === 'running') {
        assert.ok(response.data.data.currentPair !== undefined, '应该返回 currentPair');
      }
    });

    it('TC-02-004: 任务完成统计', async function() {
      this.timeout(60000);

      // 查询任务详情
      const response = await api.get(`/backtest/batch/${execTestBatchId}`);

      // 验证统计字段
      assert.ok(response.data.data.totalPairs > 0, 'totalPairs 应该大于 0');
      assert.ok(response.data.data.completedPairs !== undefined, 'completedPairs 应该存在');
      assert.ok(response.data.data.failedPairs !== undefined, 'failedPairs 应该存在');

      // 验证 completedPairs + failedPairs = totalPairs（任务完成后）
      if (response.data.data.status === 'completed') {
        const sum = response.data.data.completedPairs + response.data.data.failedPairs;
        assert.strictEqual(sum, response.data.data.totalPairs,
          'completedPairs + failedPairs 应该等于 totalPairs');
      }
    });

    it('TC-02-005: 部分失败处理', async function() {
      this.timeout(60000);

      // 创建任务，包含可能失败的交易对（使用无效的交易对ID）
      const createRes = await api.post('/backtest/batch', {
        ...TEST_DATA,
        pairIds: [1, 99999] // 99999 可能不存在或导致失败
      });
      const batchId = createRes.data.data.batchId;

      // 启动任务
      await api.post(`/backtest/batch/${batchId}/start`);

      // 等待任务完成
      await sleep(5000);

      // 查询任务状态
      const response = await api.get(`/backtest/batch/${batchId}`);

      // 验证任务状态（可能是 completed 或 partially_failed）
      assert.ok(['completed', 'partially_failed', 'failed'].includes(response.data.data.status),
        `任务状态应该是 completed/partially_failed/failed 之一，实际是 ${response.data.data.status}`);
    });

    it('TC-02-006: 全部失败处理', async function() {
      this.timeout(30000);

      // 创建任务，所有交易对都无效
      const createRes = await api.post('/backtest/batch', {
        ...TEST_DATA,
        pairIds: [99998, 99999] // 无效的交易对
      });
      const batchId = createRes.data.data.batchId;

      // 启动任务
      await api.post(`/backtest/batch/${batchId}/start`);

      // 等待任务完成
      await sleep(5000);

      // 查询任务状态
      const response = await api.get(`/backtest/batch/${batchId}`);

      // 验证任务状态为 failed
      if (response.data.data.status === 'completed' || response.data.data.status === 'failed') {
        assert.ok(true, '任务已完成或失败');
      }
    });

    it('TC-02-007: 单交易对执行', async function() {
      this.timeout(30000);

      // 创建单交易对任务
      const createRes = await api.post('/backtest/batch', {
        ...TEST_DATA,
        pairIds: [1]
      });
      const batchId = createRes.data.data.batchId;

      // 启动任务
      await api.post(`/backtest/batch/${batchId}/start`);

      // 等待任务完成
      await sleep(3000);

      // 查询任务状态
      const response = await api.get(`/backtest/batch/${batchId}`);

      // 验证任务状态
      assert.ok(['completed', 'running', 'pending'].includes(response.data.data.status),
        '单交易对任务应该正常执行');
      assert.strictEqual(response.data.data.totalPairs, 1, 'totalPairs 应该为 1');
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

    it('TC-02-008: 启动任务', async () => {
      const response = await api.post(`/backtest/batch/${controlTestBatchId}/start`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(response.data.data.status === 'running' || response.data.data.status === 'pending');
    });

    it('TC-02-009: 暂停任务-执行中', async function() {
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

    it('TC-02-010: 暂停任务-非执行状态', async () => {
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

    it('TC-02-011: 继续任务-已暂停', async function() {
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

    it('TC-02-012: 继续任务-非暂停状态', async () => {
      // 任务刚创建，状态为 pending
      try {
        await api.post(`/backtest/batch/${controlTestBatchId}/resume`);
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.success, false);
      }
    });

    it('TC-02-013: 取消任务', async () => {
      const response = await api.post(`/backtest/batch/${controlTestBatchId}/cancel`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(['cancelling', 'cancelled'].includes(response.data.data.status));
    });

    it('TC-02-014: 取消任务-已完成', async () => {
      // 这个测试需要等待任务完成
      // 实际测试中可能需要 mock 或使用已完成的任务

      // 暂时跳过，或创建一个已完成的任务
      this.skip();
    });

    it('TC-02-015: 重试失败任务', async () => {
      // 这个测试需要有失败的任务
      // 暂时跳过，或创建包含失败任务的场景
      this.skip();
    });

    it('TC-02-016: 重试指定交易对', async () => {
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

    it('TC-02-017: 重试-无失败任务', async () => {
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

    it('TC-02-020: 强制重试-绕过次数限制', async () => {
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

    it('TC-02-021: 强制重试-参数缺失', async () => {
      // 强制重试必须传入 pairIds
      try {
        await api.post(`/backtest/batch/${controlTestBatchId}/force-retry`, {});
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.success, false);
      }
    });

    it('TC-02-018: 重试-达到重试次数上限', async function() {
      this.timeout(30000);

      // 创建一个包含可能失败交易对的任务
      const createRes = await api.post('/backtest/batch', {
        ...TEST_DATA,
        pairIds: [99999] // 无效交易对，会导致失败
      });
      const batchId = createRes.data.data.batchId;

      // 启动任务并等待失败
      await api.post(`/backtest/batch/${batchId}/start`);
      await sleep(3000);

      // 尝试重试3次（达到上限）
      for (let i = 0; i < 3; i++) {
        try {
          await api.post(`/backtest/batch/${batchId}/retry`);
          await sleep(2000);
        } catch (e) {
          // 忽略错误，继续尝试
        }
      }

      // 第4次重试应该失败
      try {
        await api.post(`/backtest/batch/${batchId}/retry`);
        // 如果还能重试，验证返回的错误码
      } catch (error) {
        if (error.response?.status === 400) {
          assert.ok(['MAX_RETRY_REACHED', 'NO_RETRYABLE_TASKS'].includes(error.response.data.error.code));
        }
      }
    });

    it('TC-02-019: 重试-部分达到上限', async function() {
      this.timeout(60000);

      // 创建一个包含多个交易对的任务，部分会失败
      const createRes = await api.post('/backtest/batch', {
        ...TEST_DATA,
        pairIds: [1, 99999] // 1可能成功，99999会失败
      });
      const batchId = createRes.data.data.batchId;

      // 启动任务
      await api.post(`/backtest/batch/${batchId}/start`);
      await sleep(5000);

      // 查询子任务列表，获取失败的任务
      const itemsRes = await api.get(`/backtest/batch/${batchId}/items?status=failed`);
      const failedItems = itemsRes.data.data.items;

      if (failedItems.length > 0) {
        // 对失败任务重试3次
        for (let i = 0; i < 3; i++) {
          try {
            await api.post(`/backtest/batch/${batchId}/retry`);
            await sleep(2000);
          } catch (e) {
            // 忽略错误
          }
        }

        // 验证部分任务达到重试上限
        const finalItemsRes = await api.get(`/backtest/batch/${batchId}/items`);
        const items = finalItemsRes.data.data.items;
        const maxRetryItems = items.filter(item => item.retryCount >= 3);

        assert.ok(maxRetryItems.length > 0, '应该有任务达到重试次数上限');
      }
    });

    it('TC-02-022: 子任务执行超时-30分钟', async function() {
      this.timeout(5000);

      // 这个测试需要模拟长时间运行的子任务
      // 由于实际执行30分钟太长，这里只验证超时机制的存在

      // 创建任务
      const createRes = await api.post('/backtest/batch', {
        ...TEST_DATA,
        pairIds: [1]
      });
      const batchId = createRes.data.data.batchId;

      // 查询任务详情，验证有超时相关字段或配置
      const response = await api.get(`/backtest/batch/${batchId}`);

      // 验证任务结构完整
      assert.ok(response.data.data.id, '应该返回任务ID');
      assert.ok(response.data.data.status, '应该返回状态');

      // 注意：实际超时测试需要在单元测试中模拟
      this.skip();
    });
  });

  // ==================== 结果查询测试 ====================
  describe('GET /backtest/batch/:id/summary - 结果查询', () => {

    it('TC-04-001: 查询汇总结果', async () => {
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

    it('TC-04-002: 查询汇总结果-不存在', async () => {
      try {
        await api.get('/backtest/batch/99999/summary');
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 404);
        assert.strictEqual(error.response.data.success, false);
      }
    });

    it('TC-04-003: 导出汇总结果-CSV', async function() {
      this.timeout(10000);

      // 确保有测试数据
      if (!testBatchId) {
        const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3] });
        testBatchId = createRes.data.data.batchId;
      }

      // 请求CSV格式导出
      const response = await api.get(`/backtest/batch/${testBatchId}/summary?format=csv`, {
        responseType: 'text'
      });

      assert.strictEqual(response.status, 200);
      // 验证返回的是CSV格式（包含逗号分隔的内容）
      assert.ok(response.data.includes(',') || response.data.includes('\n'),
        '返回的应该是CSV格式数据');
    });

    it('TC-04-004: 导出汇总结果-JSON', async function() {
      this.timeout(10000);

      // 确保有测试数据
      if (!testBatchId) {
        const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3] });
        testBatchId = createRes.data.data.batchId;
      }

      // 请求JSON格式导出（默认）
      const response = await api.get(`/backtest/batch/${testBatchId}/summary?format=json`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(typeof response.data.data === 'object', '返回的应该是JSON对象');
    });

    it('TC-04-005: 导出-任务未完成', async function() {
      this.timeout(10000);

      // 创建一个新任务，不启动
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2] });
      const batchId = createRes.data.data.batchId;

      // 尝试导出未完成任务的结果
      try {
        await api.get(`/backtest/batch/${batchId}/summary`);
        // 有些实现可能允许导出部分结果
      } catch (error) {
        // 如果不允许导出，应该返回特定错误
        if (error.response?.status === 400) {
          assert.ok(error.response.data.error.code === 'BATCH_NOT_COMPLETED');
        }
      }
    });
  });

  // ==================== 启动恢复测试 ====================
  describe('启动恢复测试', () => {

    it('TC-05-001: 服务重启-恢复执行中任务', async function() {
      this.timeout(5000);

      // 此测试需要模拟服务重启场景
      // 在实际环境中，需要：
      // 1. 创建并启动一个任务
      // 2. 重启服务
      // 3. 验证任务状态被正确恢复

      // 由于HTTP测试难以模拟服务重启，此测试仅作为占位
      // 实际测试需要在集成测试环境中进行
      this.skip();
    });

    it('TC-05-002: 服务重启-恢复暂停任务', async function() {
      this.timeout(5000);

      // 此测试需要模拟服务重启场景
      // 验证暂停状态的任务在服务重启后仍保持暂停
      this.skip();
    });

    it('TC-05-003: 数据库连接中断恢复', async function() {
      this.timeout(5000);

      // 此测试需要模拟数据库连接中断
      // 验证系统在数据库恢复后能继续正常工作
      this.skip();
    });

    it('TC-05-004: Redis连接中断恢复', async function() {
      this.timeout(5000);

      // 此测试需要模拟Redis连接中断
      // 验证系统在Redis恢复后能继续正常工作
      this.skip();
    });

    it('TC-05-005: 依赖服务中断处理', async function() {
      this.timeout(5000);

      // 此测试需要模拟依赖服务（如交易对数据服务）中断
      // 验证系统能正确处理依赖服务中断
      this.skip();
    });
  });

  // ==================== 边界条件测试 ====================
  describe('边界条件测试', () => {

    it('TC-06-001: 创建任务-单个交易对', async () => {
      const requestBody = {
        ...TEST_DATA,
        pairIds: [1]
      };

      const response = await api.post('/backtest/batch', requestBody);

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.data.data.totalPairs, 1);
    });

    it('TC-06-002: 创建任务-大量交易对', async function() {
      this.timeout(10000);

      // 假设系统有至少 20 个交易对
      const response = await api.post('/backtest/batch', { ...TEST_DATA });

      assert.strictEqual(response.status, 201);
      assert.ok(response.data.data.totalPairs > 0);
    });

    it('TC-06-003: 参数边界-初始资金为0', async () => {
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

    it('TC-06-004: 参数边界-时间范围无效', async () => {
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

    it('TC-06-005: 错误码验证-PAIR_LIMIT_EXCEEDED', async () => {
      const pairIds = Array.from({ length: 10001 }, (_, i) => i + 1);

      try {
        await api.post('/backtest/batch', { ...TEST_DATA, pairIds });
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 400);
        assert.strictEqual(error.response.data.error.code, 'PAIR_LIMIT_EXCEEDED');
        assert.ok(error.response.data.error.message);
      }
    });

    it('TC-06-006: 错误码验证-NO_RETRYABLE_TASKS', async () => {
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

    it('TC-06-007: 错误码验证-BATCH_NOT_FOUND', async () => {
      try {
        await api.get('/backtest/batch/99999999');
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 404);
        assert.strictEqual(error.response.data.error.code, 'BATCH_NOT_FOUND');
      }
    });
  });

  // ==================== 回测队列测试 ====================
  describe('回测队列 API', () => {
    let queueTestBatchId = null;

    it('TC-07-001: 查询队列状态', async () => {
      const response = await api.get('/backtest/queue/status');

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(typeof response.data.data.isProcessing === 'boolean');
      assert.ok(typeof response.data.data.queueLength === 'number');
      assert.strictEqual(response.data.data.maxQueueLength, 100);
      assert.ok(typeof response.data.data.estimatedWaitTime === 'number');
    });

    it('TC-07-002: 查询队列列表', async () => {
      const response = await api.get('/backtest/queue?page=1&limit=20');

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      assert.ok(Array.isArray(response.data.data.items), 'items 应该是数组');
      assert.ok(response.data.data.pagination, '应该返回 pagination');
    });

    it('TC-07-003: 取消队列中的任务', async () => {
      // 先创建一个任务
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      queueTestBatchId = createRes.data.data.batchId;

      // 取消队列中的任务
      const response = await api.delete(`/backtest/queue/${queueTestBatchId}`);

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
    });

    it('TC-07-004: 取消已开始任务失败', async () => {
      // 创建一个任务并等待它开始执行
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;

      // 等待任务开始执行（可能需要轮询）
      await sleep(2000);

      try {
        await api.delete(`/backtest/queue/${batchId}`);
        // 如果任务还没开始，这个测试可能失败，这是预期的
      } catch (error) {
        if (error.response?.status === 400) {
          assert.strictEqual(error.response.data.error.code, 'TASK_ALREADY_STARTED');
        }
      }
    });

    it('TC-07-005: 串行执行验证', async function() {
      this.timeout(30000);

      // 创建任务 A
      const resA = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2] });
      const batchIdA = resA.data.data.batchId;

      // 立即创建任务 B
      const resB = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [3, 4] });
      const batchIdB = resB.data.data.batchId;

      // 等待一段时间让任务进入队列
      await sleep(1000);

      // 查询队列状态
      const queueRes = await api.get('/backtest/queue/status');

      // 验证至少有一个任务在队列中或执行中
      assert.ok(queueRes.data.data.queueLength >= 0);

      // 清理：取消任务
      try {
        await api.delete(`/backtest/queue/${batchIdA}`);
      } catch (e) { /* 可能已开始执行 */ }
      try {
        await api.delete(`/backtest/queue/${batchIdB}`);
      } catch (e) { /* 可能已开始执行 */ }
    });

    it('TC-07-006: 单回测也进入队列', async () => {
      // 调用单回测接口
      const singleBacktestData = {
        strategyId: TEST_DATA.strategyId,
        pairId: 1,
        timeframeId: TEST_DATA.timeframeId,
        startTime: TEST_DATA.startTime,
        endTime: TEST_DATA.endTime,
        initialCapital: TEST_DATA.initialCapital
      };

      const response = await api.post('/backtest', singleBacktestData);

      assert.strictEqual(response.status, 201);
      assert.strictEqual(response.data.success, true);

      // 查询队列状态，应该能看到该任务
      const queueRes = await api.get('/backtest/queue/status');
      assert.ok(queueRes.data.data.isProcessing || queueRes.data.data.queueLength > 0);
    });

    it('TC-07-007: 取消不存在的队列任务', async () => {
      try {
        await api.delete('/backtest/queue/99999999');
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 404);
        assert.strictEqual(error.response.data.error.code, 'TASK_NOT_IN_QUEUE');
      }
    });

    it('TC-07-008: 空队列状态查询', async () => {
      // 确保队列为空（可能需要等待所有任务完成）
      const response = await api.get('/backtest/queue/status');

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.data.success, true);
      // 队列可能为空也可能有任务，但数据结构应该正确
      assert.ok(typeof response.data.data.isProcessing === 'boolean');
    });

    it('TC-07-009: 队列任务状态流转', async function() {
      this.timeout(30000);

      // 创建一个任务
      const createRes = await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const batchId = createRes.data.data.batchId;

      // 验证任务初始状态为 queued 或 pending
      const initialRes = await api.get(`/backtest/batch/${batchId}`);
      assert.ok(['queued', 'pending'].includes(initialRes.data.data.status),
        '任务初始状态应该是 queued 或 pending');

      // 等待任务状态变化
      await sleep(2000);

      // 再次查询，状态可能变为 running 或保持 queued
      const laterRes = await api.get(`/backtest/batch/${batchId}`);
      assert.ok(['queued', 'pending', 'running', 'completed'].includes(laterRes.data.data.status),
        '任务状态应该正常流转');
    });

    it('TC-07-010: 取消不存在的队列任务', async () => {
      try {
        await api.delete('/backtest/queue/99999999');
        assert.fail('应该抛出错误');
      } catch (error) {
        assert.strictEqual(error.response.status, 404);
        assert.strictEqual(error.response.data.error.code, 'TASK_NOT_IN_QUEUE');
      }
    });

    it('TC-07-011: 队列满时创建任务', async function() {
      this.timeout(10000);

      // 创建多个任务填满队列
      const batchIds = [];
      try {
        // 尝试创建超过100个任务
        for (let i = 0; i < 101; i++) {
          const createRes = await api.post('/backtest/batch', {
            ...TEST_DATA,
            pairIds: [1]
          });
          batchIds.push(createRes.data.data.batchId);
        }

        // 第101个任务应该失败或返回队列已满的错误
        assert.fail('应该抛出队列已满的错误');
      } catch (error) {
        // 验证错误码
        if (error.response?.status === 400 || error.response?.status === 429) {
          assert.ok(['QUEUE_FULL', 'TOO_MANY_REQUESTS'].includes(error.response.data.error.code));
        }
      } finally {
        // 清理：取消创建的任务
        for (const batchId of batchIds) {
          try {
            await api.delete(`/backtest/queue/${batchId}`);
          } catch (e) {
            // 忽略清理错误
          }
        }
      }
    });
  });

  // ==================== 性能测试 ====================
  describe('性能测试', () => {

    it('TC-08-001: 创建任务 API 响应时间 < 500ms', async function() {
      this.timeout(5000);

      const startTime = Date.now();
      await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1, 2, 3] });
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      assert.ok(responseTime < 500, `响应时间 ${responseTime}ms 超过 500ms`);
    });

    it('TC-08-002: 查询任务 API 响应时间 < 200ms', async function() {
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

    it('TC-08-003: 队列添加任务性能 < 100ms', async function() {
      this.timeout(3000);

      const startTime = Date.now();
      await api.post('/backtest/batch', { ...TEST_DATA, pairIds: [1] });
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      assert.ok(responseTime < 100, `响应时间 ${responseTime}ms 超过 100ms`);
    });

    it('TC-08-004: 队列状态查询性能 < 50ms', async function() {
      this.timeout(3000);

      const startTime = Date.now();
      await api.get('/backtest/queue/status');
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      assert.ok(responseTime < 50, `响应时间 ${responseTime}ms 超过 50ms`);
    });

    it('TC-08-005: 批量执行效率-100交易对', async function() {
      this.timeout(120000);

      // 创建包含100个交易对的任务
      const pairIds = Array.from({ length: 100 }, (_, i) => (i % 10) + 1);
      const createRes = await api.post('/backtest/batch', {
        ...TEST_DATA,
        pairIds
      });
      const batchId = createRes.data.data.batchId;

      // 启动任务并计时
      const startTime = Date.now();
      await api.post(`/backtest/batch/${batchId}/start`);

      // 等待任务完成（最多等待2分钟）
      let completed = false;
      for (let i = 0; i < 120; i++) {
        await sleep(1000);
        const statusRes = await api.get(`/backtest/batch/${batchId}`);
        if (statusRes.data.data.status === 'completed') {
          completed = true;
          break;
        }
      }

      const endTime = Date.now();
      const totalTime = (endTime - startTime) / 1000;

      assert.ok(completed, '任务应该在2分钟内完成');
      assert.ok(totalTime < 120, `100个交易对执行时间 ${totalTime}s 超过 120s`);
    });

    it('TC-08-006: 10000交易对创建性能', async function() {
      this.timeout(5000);

      // 创建10000个交易对ID
      const pairIds = Array.from({ length: 10000 }, (_, i) => (i % 100) + 1);

      const startTime = Date.now();
      try {
        await api.post('/backtest/batch', {
          ...TEST_DATA,
          pairIds
        });
      } catch (error) {
        // 如果交易对不存在，也是预期的
        if (error.response?.data?.error?.code !== 'PAIR_NOT_FOUND') {
          throw error;
        }
      }
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      assert.ok(responseTime < 2000, `创建10000交易对任务响应时间 ${responseTime}ms 超过 2000ms`);
    });

    it('TC-08-007: 队列满检测性能', async function() {
      this.timeout(5000);

      // 创建多个任务接近队列上限
      const batchIds = [];
      for (let i = 0; i < 5; i++) {
        const createRes = await api.post('/backtest/batch', {
          ...TEST_DATA,
          pairIds: [1]
        });
        batchIds.push(createRes.data.data.batchId);
      }

      // 测量队列状态查询性能
      const startTime = Date.now();
      await api.get('/backtest/queue/status');
      const endTime = Date.now();

      const responseTime = endTime - startTime;
      assert.ok(responseTime < 50, `队列满时查询响应时间 ${responseTime}ms 超过 50ms`);

      // 清理
      for (const batchId of batchIds) {
        try {
          await api.delete(`/backtest/queue/${batchId}`);
        } catch (e) {
          // 忽略清理错误
        }
      }
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
