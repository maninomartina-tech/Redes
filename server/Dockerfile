# Imagen del servidor de Demm.
# Sirve para desplegarlo en Render, Railway, Fly.io o cualquier hosting que
# acepte contenedores, y así tener una dirección pública estable.
FROM node:22-slim

WORKDIR /app

# Dependencias primero: aprovecha la caché entre despliegues.
COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY scripts ./scripts

# La base y los archivos subidos van en un volumen para que sobrevivan
# a los redespliegues.
ENV DB_PATH=/datos/demm.db
ENV FILES_PATH=/datos/archivos
VOLUME ["/datos"]

ENV PORT=4000
EXPOSE 4000

CMD ["node", "src/index.js"]
