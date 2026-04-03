export default () => ({
  port: parseInt(process.env.PORT || '', 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '', 10) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '', 10) || 6379,
    password: process.env.REDIS_PASSWORD,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    botUsername: process.env.TELEGRAM_BOT_USERNAME,
    webAppUrl: process.env.TELEGRAM_WEBAPP_URL,
  },
  admin: {
    password: process.env.ADMIN_PASSWORD,
  },
});
