import { Injectable } from '@nestjs/common';
import { ErrorLogDocument } from './models/error-log.schema';
import { RequestLogDocument } from './models/request-log.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class LoggerService {
  constructor(
    @InjectModel(RequestLogDocument.name, 'loggingConnection')
    private readonly requestLogDocument: Model<RequestLogDocument>,
    @InjectModel(ErrorLogDocument.name, 'loggingConnection')
    private readonly errorLogDocument: Model<ErrorLogDocument>,
  ) {}

  async logRequest(
    log: Partial<RequestLogDocument>,
  ): Promise<RequestLogDocument> {
    const createdLog = new this.requestLogDocument(log);
    return createdLog.save();
  }

  async logError(log: Partial<ErrorLogDocument>): Promise<ErrorLogDocument> {
    const createdLog = new this.errorLogDocument(log);
    return createdLog.save();
  }
}
