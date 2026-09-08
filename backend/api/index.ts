import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import express from "express";
import { AppModule } from "../src/app.module";

// Bootstrap único reaproveitado entre invocações "quentes" da função serverless.
let cachedServer: express.Express | null = null;

async function bootstrap(): Promise<express.Express> {
  if (cachedServer) return cachedServer;

  const server = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
  app.enableCors({ origin: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix("api");
  await app.init();

  cachedServer = server;
  return server;
}

export default async function handler(req: express.Request, res: express.Response) {
  const server = await bootstrap();
  server(req, res);
}
