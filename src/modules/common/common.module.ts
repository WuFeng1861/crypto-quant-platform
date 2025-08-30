import { Module, Global } from '@nestjs/common';
import { CommonServicesModule } from './services/common-services.module';

@Global()
@Module({
  imports: [CommonServicesModule],
  exports: [CommonServicesModule],
})
export class CommonModule {}
