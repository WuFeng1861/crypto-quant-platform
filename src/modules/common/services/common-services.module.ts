import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ProcessExecutorService } from './process-executor.service';

@Module({
  providers: [RedisService, ProcessExecutorService],
  exports: [RedisService, ProcessExecutorService],
})
export class CommonServicesModule {}