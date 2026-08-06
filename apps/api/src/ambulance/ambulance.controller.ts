import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ambulanceCallSchema,
  ambulanceVehicleSchema,
  listQuerySchema,
  type AmbulanceCallInput,
  type AmbulanceVehicleInput,
  type ListQuery,
} from '@smart-hospital/shared';
import { AmbulanceService } from './ambulance.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('ambulance')
@ApiBearerAuth()
@Controller('ambulance')
export class AmbulanceController {
  constructor(private readonly ambulance: AmbulanceService) {}

  // ── Fleet ────────────────────────────────────────────────────
  @Get('vehicles')
  @RequireFeature('ambulance.ambulance', 'view')
  listVehicles(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.ambulance.listVehicles(branchId, q);
  }

  @Post('vehicles')
  @RequireFeature('ambulance.ambulance', 'add')
  createVehicle(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(ambulanceVehicleSchema)) body: AmbulanceVehicleInput,
  ) {
    return this.ambulance.createVehicle(user, branchId, body);
  }

  @Patch('vehicles/:id')
  @RequireFeature('ambulance.ambulance', 'edit')
  updateVehicle(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(ambulanceVehicleSchema)) body: AmbulanceVehicleInput,
  ) {
    return this.ambulance.updateVehicle(user, branchId, id, body);
  }

  @Delete('vehicles/:id')
  @HttpCode(204)
  @RequireFeature('ambulance.ambulance', 'delete')
  async removeVehicle(@CurrentUser() user: RequestUser, @BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    await this.ambulance.removeVehicle(user, branchId, id);
  }

  // ── Calls ────────────────────────────────────────────────────
  @Get('calls')
  @RequireFeature('ambulance.ambulance_call', 'view')
  listCalls(@BranchId() branchId: string, @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery) {
    return this.ambulance.listCalls(branchId, q);
  }

  @Get('calls/:id')
  @RequireFeature('ambulance.ambulance_call', 'view')
  getCall(@BranchId() branchId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.ambulance.getCall(branchId, id);
  }

  @Post('calls')
  @RequireFeature('ambulance.ambulance_call', 'add')
  createCall(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(ambulanceCallSchema)) body: AmbulanceCallInput,
  ) {
    return this.ambulance.createCall(user, branchId, body);
  }
}
