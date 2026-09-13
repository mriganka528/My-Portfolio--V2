-- Preserve the visibility of existing work history until the admin hides it.
ALTER TABLE "Profile" ADD COLUMN "showExperience" BOOLEAN NOT NULL DEFAULT true;
