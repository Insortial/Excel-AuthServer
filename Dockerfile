# Use an Ubuntu base image
FROM node:18.13-alpine3.17

RUN apk update && \
	apk add curl gcc libc-dev g++ libffi-dev libxml2 unixodbc unixodbc-dev openssl perl gnupg python3 git vim pingu nodejs make npm bash

RUN curl -O https://download.microsoft.com/download/1/f/f/1fffb537-26ab-4947-a46a-7a45c27f6f77/msodbcsql18_18.2.1.1-1_amd64.apk
RUN curl -O https://download.microsoft.com/download/1/f/f/1fffb537-26ab-4947-a46a-7a45c27f6f77/mssql-tools18_18.2.1.1-1_amd64.apk

#(Optional) Verify signature, if 'gpg' is missing install it using 'apk add gnupg':

RUN curl -O https://download.microsoft.com/download/1/f/f/1fffb537-26ab-4947-a46a-7a45c27f6f77/msodbcsql18_18.2.1.1-1_amd64.sig
RUN curl -O https://download.microsoft.com/download/1/f/f/1fffb537-26ab-4947-a46a-7a45c27f6f77/mssql-tools18_18.2.1.1-1_amd64.sig

RUN curl https://packages.microsoft.com/keys/microsoft.asc  | gpg --import -
RUN gpg --verify msodbcsql18_18.2.1.1-1_amd64.sig msodbcsql18_18.2.1.1-1_amd64.apk
RUN gpg --verify mssql-tools18_18.2.1.1-1_amd64.sig mssql-tools18_18.2.1.1-1_amd64.apk

#Install the package(s)

RUN apk add --allow-untrusted msodbcsql18_18.2.1.1-1_amd64.apk
RUN apk add --allow-untrusted mssql-tools18_18.2.1.1-1_amd64.apk

COPY .env /app/
COPY package.json /app/
COPY src/ /app/src/
COPY tsconfig.json /app/

WORKDIR /app/
RUN npm i
RUN npm run build
COPY .env /app/dist/
RUN ls -la


CMD ["node", "dist/index.js"] 