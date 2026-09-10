import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './data-source.options';

export default new DataSource(buildDataSourceOptions());
