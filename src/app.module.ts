import { Module } from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { RaspiVideoStreamService } from './raspi-video-stream/raspi-video-stream.service';

@Module({
  imports: [],
  controllers: [],
  providers: [AppGateway, RaspiVideoStreamService],
})
export class AppModule {}
