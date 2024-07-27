import { Module, DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModelDefinition, MongooseModule } from '@nestjs/mongoose';

@Module({})
export class DatabaseModule {
  static forRootAsync(
    connectionName: string,
    useFactory: (configService: ConfigService) => string,
    models: ModelDefinition[],
  ): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [
        MongooseModule.forRootAsync({
          connectionName,
          useFactory: (configService: ConfigService) => ({
            uri: useFactory(configService),
          }),
          inject: [ConfigService],
        }),
        MongooseModule.forFeature(models, connectionName),
      ],
      exports: [
        MongooseModule.forRootAsync({
          connectionName,
          useFactory: (configService: ConfigService) => ({
            uri: useFactory(configService),
          }),
          inject: [ConfigService],
        }),
        MongooseModule.forFeature(models, connectionName),
      ],
    };
  }
}
