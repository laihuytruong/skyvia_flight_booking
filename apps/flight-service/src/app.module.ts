import { Module } from '@nestjs/common';
import { SharedHttpModule } from '@packages/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [SharedHttpModule.forRoot('flight-service')],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
