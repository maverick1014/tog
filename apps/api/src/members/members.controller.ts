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
import { MembersService } from './members.service';
import { CreateMemberDto, UpdateMemberDto } from './dto';

@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  findAll(
    @Query('church_role') churchRole?: string,
    @Query('group_position') groupPosition?: string,
    @Query('group_id') groupId?: string,
    @Query('q') q?: string,
  ) {
    return this.members.findAll({
      church_role: churchRole,
      group_position: groupPosition,
      group_id: groupId,
      q,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.members.findOne(id);
  }

  @Get(':id/trainings')
  trainingRecord(@Param('id') id: string) {
    return this.members.trainingRecord(id);
  }

  @Post()
  create(@Body() dto: CreateMemberDto) {
    return this.members.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.members.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.members.remove(id);
  }
}
