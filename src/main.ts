import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { TransformInterceptor } from './modules/common/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './modules/common/filters/http-exception.filter';

async function bootstrap() {
  try {
    console.log('正在创建NestJS应用...');
    const app = await NestFactory.create(AppModule);
    
    console.log('设置全局管道...');
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    
    console.log('设置全局拦截器...');
    app.useGlobalInterceptors(new TransformInterceptor());
    
    console.log('设置全局异常过滤器...');
    app.useGlobalFilters(new HttpExceptionFilter());
    
    console.log('启用CORS...');
    app.enableCors();
    
    const port = process.env.PORT || 3099;
    console.log(`尝试在端口 ${port} 上启动应用...`);
    
    await app.listen(port);
    console.log(`应用已成功启动，监听端口: ${port}`);
  } catch (error) {
    console.error('应用启动失败，错误详情:');
    console.error(error);
  }
}

console.log('开始启动应用...');
bootstrap();
