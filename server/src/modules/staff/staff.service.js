import bcrypt from 'bcryptjs';
import prisma from '../../database/prisma.js';
import { ConflictError } from '../../utils/errors.js';

const SALT_ROUNDS = 10;

export async function createStaffMember(data) {
  const email = data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new ConflictError('A user with this email address already exists.');
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const staff = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      role: 'STAFF',
      first_name: data.first_name,
      last_name: data.last_name,
    },
    select: {
      id: true,
      email: true,
      role: true,
      first_name: true,
      last_name: true,
      created_at: true,
    },
  });

  return staff;
}

export async function listStaffMembers() {
  return prisma.user.findMany({
    where: { role: 'STAFF' },
    select: {
      id: true,
      email: true,
      role: true,
      first_name: true,
      last_name: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' },
  });
}

