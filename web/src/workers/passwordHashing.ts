import { hashPasswordForLogin } from '@/lib/crypto';

onmessage = (ev) => {
  const password = ev.data[0] as string;
  const salt = ev.data[1] as string;

  const passwordHash = hashPasswordForLogin(password, salt);

  postMessage(passwordHash);
};
