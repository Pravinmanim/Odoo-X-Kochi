import bcrypt from 'bcryptjs';
import prisma from '../../database/prisma.js';
import { ConflictError, NotFoundError } from '../../utils/errors.js';

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

export async function deleteStaffMember(id, currentUserId) {
  if (id === currentUserId) {
    throw new ConflictError('Cannot delete your own administrative account.');
  }

  const staff = await prisma.user.findUnique({
    where: { id },
  });

  if (!staff || staff.role !== 'STAFF') {
    throw new NotFoundError(`Staff member with ID "${id}" was not found.`);
  }

  await prisma.user.delete({
    where: { id },
  });

  return { message: 'Staff member deleted successfully.' };
}

