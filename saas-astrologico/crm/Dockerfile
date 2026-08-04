FROM node:20-slim

WORKDIR /app

# Dependencias del sistema para Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Generar cliente Prisma
RUN npx prisma generate

EXPOSE 3000

# Migrar BD y arrancar
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
