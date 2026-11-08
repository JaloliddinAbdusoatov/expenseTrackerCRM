-- Idempotent seed for artificial challenge users (PostgreSQL). Safe to re-run.

INSERT INTO "user" (id, email, username, "passwordHash", "avatarUrl", "emailVerified", "createdAt")
VALUES
  (gen_random_uuid(), 'alex@artificial.local', 'Alex', 'artificial_user_hash_1', 'https://ui-avatars.com/api/?name=Alex&background=random', true, NOW()),
  (gen_random_uuid(), 'sarah@artificial.local', 'Sarah', 'artificial_user_hash_2', 'https://ui-avatars.com/api/?name=Sarah&background=random', true, NOW()),
  (gen_random_uuid(), 'mike@artificial.local', 'Mike', 'artificial_user_hash_3', 'https://ui-avatars.com/api/?name=Mike&background=random', true, NOW()),
  (gen_random_uuid(), 'emma@artificial.local', 'Emma', 'artificial_user_hash_4', 'https://ui-avatars.com/api/?name=Emma&background=random', true, NOW()),
  (gen_random_uuid(), 'david@artificial.local', 'David', 'artificial_user_hash_5', 'https://ui-avatars.com/api/?name=David&background=random', true, NOW()),
  (gen_random_uuid(), 'lisa@artificial.local', 'Lisa', 'artificial_user_hash_6', 'https://ui-avatars.com/api/?name=Lisa&background=random', true, NOW()),
  (gen_random_uuid(), 'tom@artificial.local', 'Tom', 'artificial_user_hash_7', 'https://ui-avatars.com/api/?name=Tom&background=random', true, NOW()),
  (gen_random_uuid(), 'julia@artificial.local', 'Julia', 'artificial_user_hash_8', 'https://ui-avatars.com/api/?name=Julia&background=random', true, NOW())
ON CONFLICT (email) DO NOTHING;

INSERT INTO "income" (id, "userId", description, amount, date, "createdAt")
SELECT
  gen_random_uuid(),
  u.id,
  'Monthly Salary',
  CASE u.username
    WHEN 'Alex' THEN 5000
    WHEN 'Sarah' THEN 4500
    WHEN 'Mike' THEN 6000
    WHEN 'Emma' THEN 4000
    WHEN 'David' THEN 5500
    WHEN 'Lisa' THEN 4800
    WHEN 'Tom' THEN 5200
    WHEN 'Julia' THEN 4300
  END,
  NOW(),
  NOW()
FROM "user" u
WHERE u.email LIKE '%@artificial.local'
  AND NOT EXISTS (
    SELECT 1 FROM "income" i WHERE i."userId" = u.id
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Alex' AND email = 'alex@artificial.local'), 'MacBook Pro', 2000, 600, 15, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Alex' AND email = 'alex@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Alex' AND g.name = 'MacBook Pro'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Alex' AND email = 'alex@artificial.local'), 'Vacation', 1500, 450, 10, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Alex' AND email = 'alex@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Alex' AND g.name = 'Vacation'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Sarah' AND email = 'sarah@artificial.local'), 'iPhone 15', 1000, 300, 12, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Sarah' AND email = 'sarah@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Sarah' AND g.name = 'iPhone 15'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Sarah' AND email = 'sarah@artificial.local'), 'Vacation', 1500, 525, 10, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Sarah' AND email = 'sarah@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Sarah' AND g.name = 'Vacation'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Mike' AND email = 'mike@artificial.local'), 'MacBook Pro', 2000, 800, 20, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Mike' AND email = 'mike@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Mike' AND g.name = 'MacBook Pro'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Mike' AND email = 'mike@artificial.local'), 'Car Down Payment', 5000, 2500, 25, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Mike' AND email = 'mike@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Mike' AND g.name = 'Car Down Payment'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Emma' AND email = 'emma@artificial.local'), 'iPhone 15', 1000, 250, 15, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Emma' AND email = 'emma@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Emma' AND g.name = 'iPhone 15'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Emma' AND email = 'emma@artificial.local'), 'Emergency Fund', 3000, 900, 20, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Emma' AND email = 'emma@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Emma' AND g.name = 'Emergency Fund'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'David' AND email = 'david@artificial.local'), 'Gaming PC', 1500, 600, 18, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'David' AND email = 'david@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'David' AND g.name = 'Gaming PC'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'David' AND email = 'david@artificial.local'), 'Vacation', 1500, 525, 12, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'David' AND email = 'david@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'David' AND g.name = 'Vacation'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Lisa' AND email = 'lisa@artificial.local'), 'MacBook Pro', 2000, 700, 22, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Lisa' AND email = 'lisa@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Lisa' AND g.name = 'MacBook Pro'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Lisa' AND email = 'lisa@artificial.local'), 'Wedding', 10000, 3500, 30, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Lisa' AND email = 'lisa@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Lisa' AND g.name = 'Wedding'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Tom' AND email = 'tom@artificial.local'), 'Emergency Fund', 3000, 1200, 25, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Tom' AND email = 'tom@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Tom' AND g.name = 'Emergency Fund'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Tom' AND email = 'tom@artificial.local'), 'Home Down Payment', 20000, 8000, 35, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Tom' AND email = 'tom@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Tom' AND g.name = 'Home Down Payment'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Julia' AND email = 'julia@artificial.local'), 'Vacation', 1500, 450, 12, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Julia' AND email = 'julia@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Julia' AND g.name = 'Vacation'
  );

INSERT INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT gen_random_uuid(), (SELECT id FROM "user" WHERE username = 'Julia' AND email = 'julia@artificial.local'), 'iPhone 15', 1000, 300, 15, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "user" WHERE username = 'Julia' AND email = 'julia@artificial.local')
  AND NOT EXISTS (
    SELECT 1 FROM "goal" g JOIN "user" u ON g."userId" = u.id WHERE u.username = 'Julia' AND g.name = 'iPhone 15'
  );
