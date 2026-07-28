import { Module } from '@nestjs/common';
import { TpaController } from './tpa.controller';
import { TpaService } from './tpa.service';

@Module({
  controllers: [TpaController],
  providers: [TpaService],
})
export class TpaModule {}
