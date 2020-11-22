import { Module } from '@nestjs/common';
import { VideoStreamService } from './video-stream.service';
import { VideoStreamGateway } from './video-stream.gateway';
import { VideoStreamConnectionService } from './video-stream-connection/video-stream-connection.service';

@Module({
  providers: [
    VideoStreamGateway,
    VideoStreamService,
    VideoStreamConnectionService
  ]
})
export class VideoStreamModule {}
