import { hashPasswordForLogin } from '@/lib/crypto';

onmessage = async (ev) => {
  const protoVersion = ev.data[0] as number;
  const username = ev.data[1] as string;
  const password = ev.data[2] as string;
  const salt64 = ev.data[3] as string;

  const passwordHash = await hashPasswordForLogin(protoVersion, username, password, salt64);

  postMessage(passwordHash);
};
