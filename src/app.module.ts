import { Module } from '@nestjs/common';
import { VideoStreamModule } from './video-stream/video-stream.module';

@Module({
  imports: [VideoStreamModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
