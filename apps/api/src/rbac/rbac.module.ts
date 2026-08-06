import { Global, Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { RolePermissionsService } from './role-permissions.service';
import { RbacController } from './rbac.controller';

@Global()
@Module({
  controllers: [RbacController],
  providers: [PermissionsService, RolePermissionsService],
  exports: [PermissionsService],
})
export class RbacModule {}
