import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { generateCertificateSchema, type GenerateCertificateInput } from '@smart-hospital/shared';
import { CertificateService } from './certificate.service';
import { RequireFeature } from '../rbac/require-feature.decorator';
import { BranchId } from '../common/decorators/branch-id.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@ApiTags('certificate')
@ApiBearerAuth()
@Controller('certificates')
export class CertificateController {
  constructor(private readonly certificates: CertificateService) {}

  @Post('generate')
  @HttpCode(200)
  @RequireFeature('certificate.generate_certificate', 'view')
  generate(
    @BranchId() branchId: string,
    @Body(new ZodValidationPipe(generateCertificateSchema)) body: GenerateCertificateInput,
  ) {
    return this.certificates.generate(branchId, body);
  }
}
