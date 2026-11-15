import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 业务异常 - 统一错误格式
 * {
 *   success: false,
 *   data: null,
 *   message: '错误信息',
 *   error: {
 *     code: 'ERROR_CODE',
 *     status: 400,
 *     path: '/api/xxx'
 *   }
 * }
 */
export class BusinessException extends HttpException {
  constructor(
    code: string,
    message: string,
    status: number = HttpStatus.BAD_REQUEST,
  ) {
    super(
      {
        error: code,
        message,
      },
      status,
    );
  }
}

// 常用业务异常
export class StrategyNotFoundException extends BusinessException {
  constructor(strategyId: number) {
    super('STRATEGY_NOT_FOUND', `策略不存在: ${strategyId}`, HttpStatus.BAD_REQUEST);
  }
}

export class PairNotFoundException extends BusinessException {
  constructor(pairIds: number[]) {
    super('PAIR_NOT_FOUND', `交易对不存在: ${pairIds.join(', ')}`, HttpStatus.BAD_REQUEST);
  }
}

export class PairLimitExceededException extends BusinessException {
  constructor(current: number, max: number) {
    super('PAIR_LIMIT_EXCEEDED', `交易对数量超过上限（最大 ${max} 个），当前数量：${current}`, HttpStatus.BAD_REQUEST);
  }
}

export class QueueFullException extends BusinessException {
  constructor(max: number) {
    super('QUEUE_FULL', `回测队列已满（最大 ${max} 个任务），请稍后重试`, HttpStatus.BAD_REQUEST);
  }
}

export class BatchNotFoundException extends BusinessException {
  constructor(batchId: number) {
    super('BATCH_NOT_FOUND', `批量任务不存在: ${batchId}`, HttpStatus.NOT_FOUND);
  }
}

export class InvalidStatusException extends BusinessException {
  constructor(currentStatus: string, expectedStatus: string) {
    super('INVALID_STATUS', `当前状态 ${currentStatus} 不允许此操作，期望状态: ${expectedStatus}`, HttpStatus.BAD_REQUEST);
  }
}
