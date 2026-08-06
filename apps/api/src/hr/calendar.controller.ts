import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { holidaySchema, listQuerySchema, type HolidayInput, type ListQuery } from '@smart-hospital/shared';
import { CalendarService } from './calendar.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestUser } from '../common/types/request-user';

@ApiTags('annual-calendar')
@ApiBearerAuth()
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendar: CalendarService) {}

  @Get('holidays')
  @RequireFeature('annual_calendar.annual_calendar', 'view')
  list(
    @BranchId() branchId: string,
    @Query('type') type: string | undefined,
    @Query(new ZodValidationPipe(listQuerySchema)) q: ListQuery,
  ) {
    return this.calendar.list(branchId, type, q);
  }

  @Post('holidays')
  @RequireFeature('annual_calendar.annual_calendar', 'add')
  create(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(holidaySchema)) body: HolidayInput,
  ) {
    return this.calendar.create(user, branchId, body);
  }

  @Delete('holidays/:id')
  @HttpCode(204)
  @RequireFeature('annual_calendar.annual_calendar', 'delete')
  async remove(
    @CurrentUser() user: RequestUser,
    @BranchId() branchId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.calendar.remove(user, branchId, id);
  }
}
