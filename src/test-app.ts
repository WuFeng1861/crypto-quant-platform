import { NestFactory } from '@nestjs/core';
import { Module, Controller, Get } from '@nestjs/common';

@Controller()
class AppController {
  @Get()
  getHello(): string {
    return 'Hello World!';
  }
}

@Module({
  controllers: [AppController],
})
class AppModule {}

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);
    await app.listen(3099);
    console.log('应用已启动，监听端口: 3099');
  } catch (error) {
    console.error('应用启动失败:', error);
  }
}
bootstrap();