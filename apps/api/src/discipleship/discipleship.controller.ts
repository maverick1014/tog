import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { DiscipleshipService } from './discipleship.service';
import {
  CreatePairDto,
  CreateProgramDto,
  ProgressDto,
  UpdatePairDto,
} from './dto';

@Controller('discipleship')
export class DiscipleshipController {
  constructor(private readonly service: DiscipleshipService) {}

  // Programs
  @Get('programs') listPrograms() {
    return this.service.listPrograms();
  }
  @Post('programs') createProgram(@Body() dto: CreateProgramDto) {
    return this.service.createProgram(dto);
  }
  @Get('programs/:id') getProgram(@Param('id') id: string) {
    return this.service.getProgram(id);
  }
  @Get('programs/:id/overview') overview(@Param('id') id: string) {
    return this.service.overview(id);
  }

  // Pairs
  @Get('pairs') listPairs(@Query('program_id') programId?: string) {
    return this.service.listPairs(programId);
  }
  @Post('pairs') createPair(@Body() dto: CreatePairDto) {
    return this.service.createPair(dto);
  }
  @Get('pairs/:id') getPair(@Param('id') id: string) {
    return this.service.getPair(id);
  }
  @Patch('pairs/:id') updatePair(
    @Param('id') id: string,
    @Body() dto: UpdatePairDto,
  ) {
    return this.service.updatePair(id, dto);
  }
  @Delete('pairs/:id') removePair(@Param('id') id: string) {
    return this.service.removePair(id);
  }

  // Daily progress form (filled by the mentor)
  @Post('pairs/:id/progress') upsertProgress(
    @Param('id') id: string,
    @Body() dto: ProgressDto,
  ) {
    return this.service.upsertProgress(id, dto);
  }

  // Private per-pair form link (no login): GET the pair, POST today's entry.
  @Get('form/:token') getByToken(@Param('token') token: string) {
    return this.service.getPairByToken(token);
  }
  @Post('form/:token/progress') submitByToken(
    @Param('token') token: string,
    @Body() dto: ProgressDto,
  ) {
    return this.service.submitProgressByToken(token, dto);
  }
}
