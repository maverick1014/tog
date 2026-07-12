import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TrainingsService } from './trainings.service';
import {
  CreateTrainingDto,
  EnrollDto,
  SessionAttendanceDto,
  SessionDto,
  UpdateEnrollmentDto,
} from './dto';

@Controller('trainings')
export class TrainingsController {
  constructor(private readonly trainings: TrainingsService) {}

  // Trainings
  @Get() findAll() {
    return this.trainings.findAll();
  }
  @Get(':id') findOne(@Param('id') id: string) {
    return this.trainings.findOne(id);
  }
  @Post() create(@Body() dto: CreateTrainingDto) {
    return this.trainings.create(dto);
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: CreateTrainingDto) {
    return this.trainings.update(id, dto);
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.trainings.remove(id);
  }

  // Namelist for checking
  @Get(':id/namelist') namelist(@Param('id') id: string) {
    return this.trainings.namelist(id);
  }

  // Sessions
  @Post(':id/sessions') addSession(
    @Param('id') id: string,
    @Body() dto: SessionDto,
  ) {
    return this.trainings.addSession(id, dto);
  }
  @Patch('sessions/:sessionId') updateSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: SessionDto,
  ) {
    return this.trainings.updateSession(sessionId, dto);
  }
  @Delete('sessions/:sessionId') removeSession(
    @Param('sessionId') sessionId: string,
  ) {
    return this.trainings.removeSession(sessionId);
  }
  @Post('sessions/:sessionId/attendance') recordSessionAttendance(
    @Param('sessionId') sessionId: string,
    @Body() dto: SessionAttendanceDto,
  ) {
    return this.trainings.recordSessionAttendance(sessionId, dto);
  }

  // Enrollment
  @Post(':id/enroll') enroll(@Param('id') id: string, @Body() dto: EnrollDto) {
    return this.trainings.enroll(id, dto);
  }
  @Patch('enrollments/:enrollmentId') updateEnrollment(
    @Param('enrollmentId') enrollmentId: string,
    @Body() dto: UpdateEnrollmentDto,
  ) {
    return this.trainings.updateEnrollment(enrollmentId, dto);
  }
  @Delete('enrollments/:enrollmentId') removeEnrollment(
    @Param('enrollmentId') enrollmentId: string,
  ) {
    return this.trainings.removeEnrollment(enrollmentId);
  }
}
