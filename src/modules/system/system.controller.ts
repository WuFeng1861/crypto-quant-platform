import { Controller, Post, Body, HttpException, HttpStatus, Get } from '@nestjs/common';
import { SystemService } from './system.service';
import { StartupService } from './startup.service';
import {IsNotEmpty, IsString} from 'class-validator';

class RestartDto {
  @IsNotEmpty()
  @IsString()
  password: string;
}

@Controller('system')
export class SystemController {
  constructor(
    private readonly systemService: SystemService,
    private readonly startupService: StartupService,
  ) {}

  @Post('restart-p')
  async restart(@Body() restartDto: RestartDto) {
    console.log(process.env.SERVER_PASSWORD, restartDto)
    if (restartDto.password !== process.env.SERVER_PASSWORD) {
      throw new HttpException('Invalid password', HttpStatus.UNAUTHORIZED);
    }
    
    await this.systemService.restart();
    return { message: 'System is shutting down' };
  }

  @Get('running-backtests-count')
  async getRunningBacktestsCount(): Promise<{ count: number }> {
    const count = await this.startupService.getRunningBacktestsCount();
    return { count };
  }

  @Post('check-and-restart-backtests')
  async checkAndRestartBacktests(): Promise<{ success: boolean; message: string; processedCount: number }> {
    return this.startupService.manualCheckAndRestart();
  }
}
