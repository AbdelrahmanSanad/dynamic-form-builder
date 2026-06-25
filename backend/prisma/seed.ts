import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

/**
 * Seeds a demo account and a published sample form so reviewers can explore the
 * app immediately. Safe to run repeatedly (idempotent on the demo user).
 */
const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'password123';

async function main(): Promise<void> {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, name: 'Demo User', passwordHash },
  });

  const existing = await prisma.form.findFirst({
    where: { ownerId: user.id, title: 'Customer Feedback' },
  });

  if (!existing) {
    await prisma.form.create({
      data: {
        ownerId: user.id,
        title: 'Customer Feedback',
        description: 'Tell us about your experience.',
        status: 'PUBLISHED',
        publishedAt: new Date(),
        slug: 'customer-feedback-demo123',
        schema: [
          { id: 'f1', type: 'text', label: 'Your name', name: 'name', required: true },
          { id: 'f2', type: 'email', label: 'Email', name: 'email', required: true },
          {
            id: 'f3',
            type: 'select',
            label: 'How satisfied are you?',
            name: 'satisfaction',
            required: true,
            options: [
              { label: 'Very satisfied', value: 'very_satisfied' },
              { label: 'Satisfied', value: 'satisfied' },
              { label: 'Neutral', value: 'neutral' },
              { label: 'Dissatisfied', value: 'dissatisfied' },
            ],
          },
          {
            id: 'f4',
            type: 'textarea',
            label: 'Comments',
            name: 'comments',
            required: false,
            placeholder: 'Anything else you would like to share?',
          },
          {
            id: 'f5',
            type: 'checkbox',
            label: 'I agree to be contacted about my feedback',
            name: 'consent',
            required: false,
          },
        ],
      },
    });
  }

  console.log(`Seeded demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
