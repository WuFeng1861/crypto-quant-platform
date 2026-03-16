import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { BatchBacktestService } from './batch-backtest.service';
import { BatchBacktest, BatchBacktestStatus } from './entities/batch-backtest.entity';
import { BatchBacktestItem, BatchBacktestItemStatus } from './entities/batch-backtest-item.entity';
import { TradingPair } from '../common/entities/trading-pair.entity';
import { BacktestService } from './backtest.service';
import { StrategiesService } from '../strategies/strategies.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock Repositories
const mockBatchBacktestRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  update: jest.fn(),
  increment: jest.fn(),
});

const mockBatchBacktestItemRepository = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
});

const mockTradingPairRepository = () => ({
  find: jest.fn(),
  findBy: jest.fn(),
});

const mockBacktestService = () => ({
  runBacktest: jest.fn(),
});

const mockStrategiesService = () => ({
  findOne: jest.fn(),
});

describe('BatchBacktestService', () => {
  let service: BatchBacktestService;
  let batchRepo: jest.Mocked<Repository<BatchBacktest>>;
  let itemRepo: jest.Mocked<Repository<BatchBacktestItem>>;
  let pairRepo: jest.Mocked<Repository<TradingPair>>;
  let backtestService: jest.Mocked<BacktestService>;
  let strategiesService: jest.Mocked<StrategiesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchBacktestService,
        {
          provide: getRepositoryToken(BatchBacktest),
          useFactory: mockBatchBacktestRepository,
        },
        {
          provide: getRepositoryToken(BatchBacktestItem),
          useFactory: mockBatchBacktestItemRepository,
        },
        {
          provide: getRepositoryToken(TradingPair),
          useFactory: mockTradingPairRepository,
        },
        {
          provide: BacktestService,
          useFactory: mockBacktestService,
        },
        {
          provide: StrategiesService,
          useFactory: mockStrategiesService,
        },
      ],
    }).compile();

    service = module.get<BatchBacktestService>(BatchBacktestService);
    batchRepo = module.get(getRepositoryToken(BatchBacktest));
    itemRepo = module.get(getRepositoryToken(BatchBacktestItem));
    pairRepo = module.get(getRepositoryToken(TradingPair));
    backtestService = module.get(BacktestService);
    strategiesService = module.get(StrategiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBatchBacktest', () => {
    const mockDto = {
      strategyId: 1,
      timeframeId: 1,
      startTime: '2024-01-01T00:00:00.000Z',
      endTime: '2024-12-31T23:59:59.000Z',
      initialCapital: 10000,
    };

    it('should create batch backtest with specified pairIds', async () => {
      const mockStrategy = { id: 1, name: 'Test Strategy' };
      const mockPairs = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const mockBatch = {
        id: 1,
        strategyId: 1,
        totalPairs: 3,
        status: BatchBacktestStatus.PENDING,
      };

      strategiesService.findOne.mockResolvedValue(mockStrategy as any);
      pairRepo.findBy.mockResolvedValue(mockPairs as any);
      batchRepo.create.mockReturnValue(mockBatch as any);
      batchRepo.save.mockResolvedValue(mockBatch as any);
      itemRepo.create.mockReturnValue({} as any);
      itemRepo.save.mockResolvedValue([] as any);

      const result = await service.createBatchBacktest({
        ...mockDto,
        pairIds: [1, 2, 3],
      });

      expect(result).toEqual(mockBatch);
      expect(batchRepo.save).toHaveBeenCalled();
      expect(itemRepo.save).toHaveBeenCalled();
    });

    it('should throw error when strategy not found', async () => {
      strategiesService.findOne.mockResolvedValue(null);

      await expect(service.createBatchBacktest(mockDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when pairIds exceed 500', async () => {
      const mockStrategy = { id: 1, name: 'Test Strategy' };
      strategiesService.findOne.mockResolvedValue(mockStrategy as any);

      const pairIds = Array.from({ length: 501 }, (_, i) => i + 1);

      await expect(
        service.createBatchBacktest({ ...mockDto, pairIds }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when pairIds not found', async () => {
      const mockStrategy = { id: 1, name: 'Test Strategy' };
      strategiesService.findOne.mockResolvedValue(mockStrategy as any);
      pairRepo.findBy.mockResolvedValue([{ id: 1 }] as any);

      await expect(
        service.createBatchBacktest({ ...mockDto, pairIds: [1, 2, 3] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto fetch all pairs when pairIds not provided', async () => {
      const mockStrategy = { id: 1, name: 'Test Strategy' };
      const mockPairs = [{ id: 1 }, { id: 2 }];
      const mockBatch = {
        id: 1,
        strategyId: 1,
        totalPairs: 2,
        status: BatchBacktestStatus.PENDING,
      };

      strategiesService.findOne.mockResolvedValue(mockStrategy as any);
      pairRepo.find.mockResolvedValue(mockPairs as any);
      batchRepo.create.mockReturnValue(mockBatch as any);
      batchRepo.save.mockResolvedValue(mockBatch as any);
      itemRepo.create.mockReturnValue({} as any);
      itemRepo.save.mockResolvedValue([] as any);

      const result = await service.createBatchBacktest(mockDto);

      expect(result.totalPairs).toBe(2);
      expect(pairRepo.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return batch backtest', async () => {
      const mockBatch = { id: 1, status: BatchBacktestStatus.PENDING };
      batchRepo.findOne.mockResolvedValue(mockBatch as any);

      const result = await service.findOne(1);

      expect(result).toEqual(mockBatch);
    });

    it('should throw NotFoundException when batch not found', async () => {
      batchRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('pauseBatchBacktest', () => {
    it('should set pause requested flag', async () => {
      const mockBatch = { id: 1, status: BatchBacktestStatus.RUNNING };
      batchRepo.findOne.mockResolvedValue(mockBatch as any);
      batchRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.pauseBatchBacktest(1);

      expect(batchRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        pauseRequested: true,
        pauseTimeoutAt: expect.any(Date),
      }));
    });

    it('should throw error when batch not running', async () => {
      const mockBatch = { id: 1, status: BatchBacktestStatus.PENDING };
      batchRepo.findOne.mockResolvedValue(mockBatch as any);

      await expect(service.pauseBatchBacktest(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('resumeBatchBacktest', () => {
    it('should resume paused batch', async () => {
      const mockBatch = { id: 1, status: BatchBacktestStatus.PAUSED };
      batchRepo.findOne.mockResolvedValue(mockBatch as any);
      batchRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.resumeBatchBacktest(1);

      expect(batchRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: BatchBacktestStatus.RUNNING,
        pauseRequested: false,
        pauseTimeoutAt: null,
      }));
    });

    it('should throw error when batch not paused', async () => {
      const mockBatch = { id: 1, status: BatchBacktestStatus.RUNNING };
      batchRepo.findOne.mockResolvedValue(mockBatch as any);

      await expect(service.resumeBatchBacktest(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelBatchBacktest', () => {
    it('should cancel batch', async () => {
      const mockBatch = { id: 1, status: BatchBacktestStatus.RUNNING };
      batchRepo.findOne.mockResolvedValue(mockBatch as any);
      batchRepo.update.mockResolvedValue({ affected: 1 } as any);
      itemRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.cancelBatchBacktest(1);

      expect(batchRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: BatchBacktestStatus.CANCELLED,
      }));
    });

    it('should throw error when batch already completed', async () => {
      const mockBatch = { id: 1, status: BatchBacktestStatus.COMPLETED };
      batchRepo.findOne.mockResolvedValue(mockBatch as any);

      await expect(service.cancelBatchBacktest(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('retryFailedItems', () => {
    it('should retry failed items', async () => {
      const mockBatch = { id: 1, status: BatchBacktestStatus.COMPLETED };
      const mockItems = [
        { id: 1, pairId: 1, status: BatchBacktestItemStatus.FAILED, retries: 0 },
        { id: 2, pairId: 2, status: BatchBacktestItemStatus.FAILED, retries: 1 },
      ];

      batchRepo.findOne.mockResolvedValue(mockBatch as any);
      itemRepo.find.mockResolvedValue(mockItems as any);
      itemRepo.update.mockResolvedValue({ affected: 1 } as any);
      batchRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.retryFailedItems(1);

      expect(itemRepo.update).toHaveBeenCalledTimes(2);
      expect(batchRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: BatchBacktestStatus.RUNNING,
      }));
    });

    it('should throw error when no failed items', async () => {
      const mockBatch = { id: 1, status: BatchBacktestStatus.COMPLETED };
      batchRepo.findOne.mockResolvedValue(mockBatch as any);
      itemRepo.find.mockResolvedValue([] as any);

      await expect(service.retryFailedItems(1)).rejects.toThrow(BadRequestException);
    });

    it('should throw error when all items reached max retries', async () => {
      const mockBatch = { id: 1, status: BatchBacktestStatus.COMPLETED };
      const mockItems = [
        { id: 1, pairId: 1, status: BatchBacktestItemStatus.FAILED, retries: 3 },
        { id: 2, pairId: 2, status: BatchBacktestItemStatus.FAILED, retries: 3 },
      ];

      batchRepo.findOne.mockResolvedValue(mockBatch as any);
      itemRepo.find.mockResolvedValue(mockItems as any);

      await expect(service.retryFailedItems(1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('forceRetryItems', () => {
    it('should force retry items without incrementing retries', async () => {
      const mockBatch = { id: 1, status: BatchBacktestStatus.COMPLETED };
      const mockItems = [
        { id: 1, pairId: 1, status: BatchBacktestItemStatus.FAILED, retries: 3 },
      ];

      batchRepo.findOne.mockResolvedValue(mockBatch as any);
      itemRepo.find.mockResolvedValue(mockItems as any);
      itemRepo.update.mockResolvedValue({ affected: 1 } as any);
      batchRepo.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.forceRetryItems(1, { pairIds: [1] });

      expect(itemRepo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: BatchBacktestItemStatus.PENDING,
        errorMessage: null,
      }));
    });

    it('should throw error when pairIds not provided', async () => {
      const mockBatch = { id: 1, status: BatchBacktestStatus.COMPLETED };
      batchRepo.findOne.mockResolvedValue(mockBatch as any);

      await expect(service.forceRetryItems(1, { pairIds: [] })).rejects.toThrow(BadRequestException);
    });
  });
});
