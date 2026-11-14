import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateKeyPairSync } from 'node:crypto';

const identityDirectory = resolve('keys');
const gatewayDirectory = resolve('../api-gateway/keys');

const expectedFiles = [
  resolve(identityDirectory, 'access-private.pem'),
  resolve(identityDirectory, 'access-public.pem'),
  resolve(identityDirectory, 'refresh-private.pem'),
  resolve(identityDirectory, 'refresh-public.pem'),
  resolve(gatewayDirectory, 'access-public.pem'),
];

if (expectedFiles.some((file) => existsSync(file))) {
  throw new Error('Auth keys already exist. Do not overwrite active keys.');
}

mkdirSync(identityDirectory, { recursive: true });
mkdirSync(gatewayDirectory, { recursive: true });

for (const name of ['access', 'refresh']) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 3072,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  writeFileSync(resolve(identityDirectory, `${name}-private.pem`), privateKey, {
    mode: 0o600,
    flag: 'wx',
  });

  writeFileSync(resolve(identityDirectory, `${name}-public.pem`), publicKey, {
    flag: 'wx',
  });

  if (name === 'access') {
    writeFileSync(resolve(gatewayDirectory, 'access-public.pem'), publicKey, {
      flag: 'wx',
    });
  }
}

console.log('RSA auth keys created successfully');
