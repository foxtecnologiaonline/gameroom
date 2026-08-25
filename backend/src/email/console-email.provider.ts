import { Injectable, Logger } from '@nestjs/common';
import { EmailParaEnviar, EmailProvider } from './email-provider.interface';

/**
 * Provider de desenvolvimento — apenas loga o e-mail que seria enviado.
 * Em produção, trocar pela integração real (SES/Resend/SendGrid) via
 * EMAIL_PROVIDER e implementando EmailProvider.
 */
@Injectable()
export class ConsoleEmailProvider implements EmailProvider {
  private readonly logger = new Logger('EmailProvider(console)');

  async enviar(email: EmailParaEnviar): Promise<void> {
    this.logger.log(
      `Enviando e-mail para ${email.para} — assunto: "${email.assunto}"`,
    );
    this.logger.debug(email.html);
  }
}
