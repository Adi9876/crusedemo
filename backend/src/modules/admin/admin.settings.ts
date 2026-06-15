import { prisma } from '../../lib/prisma.js';

export async function isAutoApprovalEnabled(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: 'autoApprovalEnabled' }
  });
  return setting ? setting.value === 'true' : false;
}

export async function setAutoApprovalEnabled(value: boolean): Promise<void> {
  await prisma.systemSetting.upsert({
    where: { key: 'autoApprovalEnabled' },
    create: { key: 'autoApprovalEnabled', value: value.toString() },
    update: { value: value.toString() }
  });
}
