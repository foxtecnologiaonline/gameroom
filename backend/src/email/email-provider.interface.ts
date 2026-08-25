export interface EmailParaEnviar {
  para: string;
  assunto: string;
  html: string;
}

export const EMAIL_PROVIDER = 'EMAIL_PROVIDER';

export interface EmailProvider {
  enviar(email: EmailParaEnviar): Promise<void>;
}
