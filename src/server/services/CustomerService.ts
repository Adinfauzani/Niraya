import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { customers } from "@/server/db/schema";
import { CustomerRepository } from "@/server/repositories/CustomersStaff";
import type { Customer } from "@/types/business";

const customerRepository = new CustomerRepository();

export async function getCustomers(
  businessId: string,
  options: { search?: string; page?: number; pageSize?: number } = {}
): Promise<Customer[]> {
  const { search, page = 1, pageSize = 20 } = options;

  const result = await customerRepository.findByBusiness(businessId, {
    search,
    page,
    pageSize,
  });

  return result.data
    .map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      email: row.email ?? undefined,
      notes: row.notes ?? undefined,
      joinedAt: row.joinedAt.toISOString(),
    }))
    .sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
}

export async function createCustomer(
  businessId: string,
  data: { id: string; name: string; phone: string; email?: string; notes?: string; joinedAt?: string }
): Promise<{ ok: true }> {
  await customerRepository.create({
    id: data.id,
    businessId,
    name: data.name.trim(),
    phone: data.phone.trim(),
    email: data.email?.trim() || null,
    notes: data.notes?.trim() || null,
    joinedAt: data.joinedAt ? new Date(data.joinedAt) : new Date(),
  });
  return { ok: true };
}

export async function updateCustomer(
  businessId: string,
  id: string,
  data: { name: string; phone: string; email?: string; notes?: string }
): Promise<{ ok: true }> {
  await customerRepository.update(id, {
    name: data.name.trim(),
    phone: data.phone.trim(),
    email: data.email?.trim() || null,
    notes: data.notes?.trim() || null,
    updatedAt: new Date(),
  });
  return { ok: true };
}

export async function deleteCustomer(businessId: string, id: string): Promise<{ ok: true }> {
  await customerRepository.delete(id);
  return { ok: true };
}