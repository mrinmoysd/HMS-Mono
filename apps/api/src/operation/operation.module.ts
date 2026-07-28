import { Module } from '@nestjs/common';
import { OperationController } from './operation.controller';

@Module({
  controllers: [OperationController],
})
export class OperationModule {}
