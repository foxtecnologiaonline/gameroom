import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { ConsoleEmailProvider } from './console-email.provider';
import { EMAIL_PROVIDER } from './email-provider.interface';

@Module({
  providers: [
    EmailService,
    { provide: EMAIL_PROVIDER, useClass: ConsoleEmailProvider },
  ],
  exports: [EmailService],
})
export class EmailModule {}
