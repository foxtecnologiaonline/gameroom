import { Module } from '@nestjs/common';
import { ConsoleNotaFiscalProvider } from './console-nota-fiscal.provider';
import { NOTA_FISCAL_PROVIDER } from './nota-fiscal-provider.interface';

@Module({
  providers: [
    { provide: NOTA_FISCAL_PROVIDER, useClass: ConsoleNotaFiscalProvider },
  ],
  exports: [NOTA_FISCAL_PROVIDER],
})
export class NotaFiscalModule {}
