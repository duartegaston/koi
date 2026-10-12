import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Usá: node scripts/hash-admin-password.mjs "una clave de al menos 12 caracteres"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
process.stdout.write(`${hash}\n`);
process.stderr.write("En .env escapá cada $ como \\$. En wrangler secret put pegá el hash tal cual.\n");
