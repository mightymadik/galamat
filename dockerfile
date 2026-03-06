# galamat-frontend/Dockerfile
FROM node:20-alpine
# Создаем рабочую папку
WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем весь проект
COPY . .

# Build the application
RUN npm run build

# Set environment variables
ENV STRAPI_URL=http://strapi:1337
ENV NODE_ENV=production
ENV WATCHPACK_POLLING=true

# Экспонируем порт
EXPOSE 3000

# Запуск фронта in production mode
CMD ["npm", "run", "start"]