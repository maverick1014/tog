import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { MembersModule } from './members/members.module';
import { GroupsModule } from './groups/groups.module';
import { HouseholdsModule } from './households/households.module';
import { EventsModule } from './events/events.module';
import { DonationsModule } from './donations/donations.module';
import { TrainingsModule } from './trainings/trainings.module';
import { DiscipleshipModule } from './discipleship/discipleship.module';

@Controller()
class HealthController {
  @Get('health')
  health() {
    return { status: 'ok', service: 'tog-api' };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    SupabaseModule,
    MembersModule,
    GroupsModule,
    HouseholdsModule,
    EventsModule,
    DonationsModule,
    TrainingsModule,
    DiscipleshipModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
