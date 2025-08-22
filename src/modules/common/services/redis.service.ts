import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', ''),
      keyPrefix: 'crypto_quant:',
    });
  }

  async onModuleDestroy() {
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  getClient(): Redis {
    return this.redisClient;
  }

  // 存储数据到Redis，支持自动序列化对象
  async set(key: string, value: any, expireSeconds?: number): Promise<void> {
    const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
    
    if (expireSeconds) {
      await this.redisClient.set(key, serializedValue, 'EX', expireSeconds);
    } else {
      await this.redisClient.set(key, serializedValue);
    }
  }

  // 从Redis获取数据，支持自动反序列化对象
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.redisClient.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  // 删除Redis中的数据
  async delete(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  // 检查键是否存在
  async exists(key: string): Promise<boolean> {
    const result = await this.redisClient.exists(key);
    return result === 1;
  }

  // 设置过期时间
  async expire(key: string, seconds: number): Promise<void> {
    await this.redisClient.expire(key, seconds);
  }

  // 获取所有匹配的键
  async keys(pattern: string): Promise<string[]> {
    return await this.redisClient.keys(pattern);
  }
}