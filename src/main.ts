import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({
    whitelist:            true,
    forbidNonWhitelisted: true,
    transform:            true,
  }));

  app.enableCors({ origin: '*' }); // restringir em produção

  // ── Swagger / OpenAPI ─────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Corredor do Lobito API')
    .setDescription(
      `API do Corredor do Lobito — v2.0\n\n` +
      `**Autenticação:** Bearer JWT. Fazer login em \`POST /auth/login\` para obter o token.\n\n` +
      `**Roles MVP:** state · staff · specialist · producer · buyer · operator · customs\n\n` +
      `**Roles Fase 2:** admin · analyst · compliance · company\n\n` +
      `**Contas de dev (password: Lobito@Dev2024!):**\n` +
      `state@lobito.gov · staff@lobito.gov · specialist@lobito.gov · analyst@lobito.gov · ` +
      `compliance@lobito.gov · producer@lobito.biz · buyer@lobito.biz · ` +
      `operator@lobito.biz · customs@lobito.gov`,
    )
    .setVersion('2.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'JWT',
    )
    .addTag('Auth',            'Login e autenticação')
    .addTag('Companies',       'Empresas e licenciamento')
    .addTag('Products',        'Produtos e publicação')
    .addTag('Price Proposals', 'Propostas de preço com snapshot imutável')
    .addTag('Taxes',           'Regras fiscais por país e categoria')
    .addTag('Orders',          'Pedidos e pagamento com cálculo automático de imposto')
    .addTag('Transactions',    'Transacções financeiras — geradas automaticamente no pagamento')
    .addTag('Shipments',       'Embarques, tracking e alfândega')
    .addTag('Reports',               'Relatórios operacionais, fiscais e de conformidade')
    .addTag('Dashboard & Analytics', 'KPIs, métricas de receita, logística e compliance em tempo real')
    .addTag('Audit Logs',            'Registo imutável de todas as acções')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter:           'alpha',
      operationsSorter:     'alpha',
    },
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`API     → http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`Swagger → http://localhost:${process.env.PORT ?? 3000}/docs`);
}
bootstrap();
