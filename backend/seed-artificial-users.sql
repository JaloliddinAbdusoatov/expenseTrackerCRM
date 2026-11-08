-- Seed script to create artificial users with goals and income
-- Run this script: sqlite3 db.sqlite < seed-artificial-users.sql

-- Note: This script creates artificial users. If they already exist, they will be skipped.

-- Insert artificial users (using simple hex IDs - TypeORM will handle UUID format)
INSERT OR IGNORE INTO "user" (id, email, username, "passwordHash", "avatarUrl", "emailVerified", "createdAt")
VALUES 
  (lower(hex(randomblob(16))), 'alex@artificial.local', 'Alex', 'artificial_user_hash_1', 'https://ui-avatars.com/api/?name=Alex&background=random', 1, datetime('now')),
  (lower(hex(randomblob(16))), 'sarah@artificial.local', 'Sarah', 'artificial_user_hash_2', 'https://ui-avatars.com/api/?name=Sarah&background=random', 1, datetime('now')),
  (lower(hex(randomblob(16))), 'mike@artificial.local', 'Mike', 'artificial_user_hash_3', 'https://ui-avatars.com/api/?name=Mike&background=random', 1, datetime('now')),
  (lower(hex(randomblob(16))), 'emma@artificial.local', 'Emma', 'artificial_user_hash_4', 'https://ui-avatars.com/api/?name=Emma&background=random', 1, datetime('now')),
  (lower(hex(randomblob(16))), 'david@artificial.local', 'David', 'artificial_user_hash_5', 'https://ui-avatars.com/api/?name=David&background=random', 1, datetime('now')),
  (lower(hex(randomblob(16))), 'lisa@artificial.local', 'Lisa', 'artificial_user_hash_6', 'https://ui-avatars.com/api/?name=Lisa&background=random', 1, datetime('now')),
  (lower(hex(randomblob(16))), 'tom@artificial.local', 'Tom', 'artificial_user_hash_7', 'https://ui-avatars.com/api/?name=Tom&background=random', 1, datetime('now')),
  (lower(hex(randomblob(16))), 'julia@artificial.local', 'Julia', 'artificial_user_hash_8', 'https://ui-avatars.com/api/?name=Julia&background=random', 1, datetime('now'));

-- Insert income for each user
INSERT OR IGNORE INTO "income" (id, "userId", description, amount, date, "createdAt")
SELECT 
  lower(hex(randomblob(16))),
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
  datetime('now'),
  datetime('now')
FROM "user" u
WHERE u.email LIKE '%@artificial.local'
AND NOT EXISTS (
  SELECT 1 FROM "income" i WHERE i."userId" = u.id
);

-- Insert goals for Alex
INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Alex' AND email = 'alex@artificial.local'),
  'MacBook Pro',
  2000,
  600,
  15,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Alex' AND g.name = 'MacBook Pro'
);

INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Alex' AND email = 'alex@artificial.local'),
  'Vacation',
  1500,
  450,
  10,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Alex' AND g.name = 'Vacation'
);

-- Insert goals for Sarah
INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Sarah' AND email = 'sarah@artificial.local'),
  'iPhone 15',
  1000,
  300,
  12,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Sarah' AND g.name = 'iPhone 15'
);

INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Sarah' AND email = 'sarah@artificial.local'),
  'Vacation',
  1500,
  525,
  10,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Sarah' AND g.name = 'Vacation'
);

-- Insert goals for Mike
INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Mike' AND email = 'mike@artificial.local'),
  'MacBook Pro',
  2000,
  800,
  20,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Mike' AND g.name = 'MacBook Pro'
);

INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Mike' AND email = 'mike@artificial.local'),
  'Car Down Payment',
  5000,
  2500,
  25,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Mike' AND g.name = 'Car Down Payment'
);

-- Insert goals for Emma
INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Emma' AND email = 'emma@artificial.local'),
  'iPhone 15',
  1000,
  250,
  15,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Emma' AND g.name = 'iPhone 15'
);

INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Emma' AND email = 'emma@artificial.local'),
  'Emergency Fund',
  3000,
  900,
  20,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Emma' AND g.name = 'Emergency Fund'
);

-- Insert goals for David
INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'David' AND email = 'david@artificial.local'),
  'Gaming PC',
  1500,
  600,
  18,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'David' AND g.name = 'Gaming PC'
);

INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'David' AND email = 'david@artificial.local'),
  'Vacation',
  1500,
  525,
  12,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'David' AND g.name = 'Vacation'
);

-- Insert goals for Lisa
INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Lisa' AND email = 'lisa@artificial.local'),
  'MacBook Pro',
  2000,
  700,
  22,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Lisa' AND g.name = 'MacBook Pro'
);

INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Lisa' AND email = 'lisa@artificial.local'),
  'Wedding',
  10000,
  3500,
  30,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Lisa' AND g.name = 'Wedding'
);

-- Insert goals for Tom
INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Tom' AND email = 'tom@artificial.local'),
  'Emergency Fund',
  3000,
  1200,
  25,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Tom' AND g.name = 'Emergency Fund'
);

INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Tom' AND email = 'tom@artificial.local'),
  'Home Down Payment',
  20000,
  8000,
  35,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Tom' AND g.name = 'Home Down Payment'
);

-- Insert goals for Julia
INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Julia' AND email = 'julia@artificial.local'),
  'Vacation',
  1500,
  450,
  12,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Julia' AND g.name = 'Vacation'
);

INSERT OR IGNORE INTO "goal" (id, "userId", name, "targetAmount", "currentAmount", "autoAllocatePercent", "createdAt", "updatedAt")
SELECT 
  lower(hex(randomblob(16))),
  (SELECT id FROM "user" WHERE username = 'Julia' AND email = 'julia@artificial.local'),
  'iPhone 15',
  1000,
  300,
  15,
  datetime('now'),
  datetime('now')
WHERE NOT EXISTS (
  SELECT 1 FROM "goal" g 
  JOIN "user" u ON g."userId" = u.id 
  WHERE u.username = 'Julia' AND g.name = 'iPhone 15'
);

SELECT '✅ Artificial users, income, and goals created successfully!' as message;
