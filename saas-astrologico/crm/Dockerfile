FROM node:20-slim

WORKDIR /app

# Dependencias del sistema para Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar fuente
COPY . .

# Generar cliente Prisma (debe ser antes de compilar TypeScript)
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

EXPOSE 3000

# Migrar BD y arrancar
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
