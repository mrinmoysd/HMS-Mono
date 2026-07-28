import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { ChargeController } from './charge.controller';
import { ChargeService } from './charge.service';

@Module({
  controllers: [ChargeController, CatalogController],
  providers: [CatalogService, ChargeService],
})
export class MastersModule {}
