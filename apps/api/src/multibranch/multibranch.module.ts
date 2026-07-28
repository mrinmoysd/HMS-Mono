import { Module } from '@nestjs/common';
import { MultiBranchController } from './multibranch.controller';
import { MultiBranchService } from './multibranch.service';

@Module({ controllers: [MultiBranchController], providers: [MultiBranchService] })
export class MultiBranchModule {}
