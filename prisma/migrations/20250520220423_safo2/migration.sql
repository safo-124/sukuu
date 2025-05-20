/*
  Warnings:

  - You are about to drop the `Assignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StudentGrade` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[schoolId,name,category,academicYear,term,frequency]` on the table `FeeStructure` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId,date,timetableSlotId]` on the table `StudentAttendance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId,date,classId,academicYear,term]` on the table `StudentAttendance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,room,dayOfWeek,startTime]` on the table `TimetableSlot` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `balanceDue` to the `Invoice` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `Assignment` DROP FOREIGN KEY `Assignment_classId_fkey`;

-- DropForeignKey
ALTER TABLE `Assignment` DROP FOREIGN KEY `Assignment_subjectId_fkey`;

-- DropForeignKey
ALTER TABLE `Assignment` DROP FOREIGN KEY `Assignment_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `ClassAnnouncement` DROP FOREIGN KEY `ClassAnnouncement_classId_fkey`;

-- DropForeignKey
ALTER TABLE `FeeStructure` DROP FOREIGN KEY `FeeStructure_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `SchoolAnnouncement` DROP FOREIGN KEY `SchoolAnnouncement_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `StudentAttendance` DROP FOREIGN KEY `StudentAttendance_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `StudentClassEnrollment` DROP FOREIGN KEY `StudentClassEnrollment_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `StudentGrade` DROP FOREIGN KEY `StudentGrade_assignmentId_fkey`;

-- DropForeignKey
ALTER TABLE `StudentGrade` DROP FOREIGN KEY `StudentGrade_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `StudentGrade` DROP FOREIGN KEY `StudentGrade_subjectId_fkey`;

-- DropForeignKey
ALTER TABLE `StudentGrade` DROP FOREIGN KEY `StudentGrade_teacherId_fkey`;

-- DropIndex
DROP INDEX `ClassAnnouncement_classId_publishDate_idx` ON `ClassAnnouncement`;

-- DropIndex
DROP INDEX `FeeStructure_schoolId_academicYear_category_idx` ON `FeeStructure`;

-- DropIndex
DROP INDEX `FeeStructure_schoolId_name_category_academicYear_term_key` ON `FeeStructure`;

-- DropIndex
DROP INDEX `SchoolAnnouncement_schoolId_publishDate_idx` ON `SchoolAnnouncement`;

-- DropIndex
DROP INDEX `StudentAttendance_studentId_date_classId_subjectId_academicY_key` ON `StudentAttendance`;

-- DropIndex
DROP INDEX `StudentAttendance_studentId_date_timetableSlotId_academicYea_key` ON `StudentAttendance`;

-- DropIndex
DROP INDEX `StudentClassEnrollment_studentId_academicYear_idx` ON `StudentClassEnrollment`;

-- AlterTable
ALTER TABLE `Invoice` ADD COLUMN `balanceDue` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `Student` MODIFY `profilePictureUrl` TEXT NULL;

-- AlterTable
ALTER TABLE `StudentClassEnrollment` MODIFY `enrollmentDate` DATE NOT NULL;

-- AlterTable
ALTER TABLE `Teacher` MODIFY `dateOfJoining` DATE NULL;

-- DropTable
DROP TABLE `Assignment`;

-- DropTable
DROP TABLE `StudentGrade`;

-- CreateTable
CREATE TABLE `Assessment` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `academicYear` VARCHAR(191) NOT NULL,
    `term` ENUM('FIRST_TERM', 'SECOND_TERM', 'THIRD_TERM') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `maxMarks` DOUBLE NOT NULL,
    `assessmentDate` DATE NOT NULL,
    `description` TEXT NULL,
    `createdByUserId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Assessment_schoolId_academicYear_term_idx`(`schoolId`, `academicYear`, `term`),
    INDEX `Assessment_classId_subjectId_idx`(`classId`, `subjectId`),
    UNIQUE INDEX `Assessment_classId_subjectId_academicYear_term_name_key`(`classId`, `subjectId`, `academicYear`, `term`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentMark` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `marksObtained` DOUBLE NOT NULL,
    `gradeLetter` VARCHAR(191) NULL,
    `remarks` TEXT NULL,
    `recordedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `StudentMark_studentId_assessmentId_idx`(`studentId`, `assessmentId`),
    UNIQUE INDEX `StudentMark_assessmentId_studentId_key`(`assessmentId`, `studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ClassAnnouncement_classId_publishDate_isPublished_idx` ON `ClassAnnouncement`(`classId`, `publishDate`, `isPublished`);

-- CreateIndex
CREATE INDEX `FeeStructure_schoolId_academicYear_category_isActive_idx` ON `FeeStructure`(`schoolId`, `academicYear`, `category`, `isActive`);

-- CreateIndex
CREATE UNIQUE INDEX `FeeStructure_schoolId_name_category_academicYear_term_freque_key` ON `FeeStructure`(`schoolId`, `name`, `category`, `academicYear`, `term`, `frequency`);

-- CreateIndex
CREATE INDEX `SchoolAnnouncement_schoolId_publishDate_isPublished_idx` ON `SchoolAnnouncement`(`schoolId`, `publishDate`, `isPublished`);

-- CreateIndex
CREATE INDEX `Student_schoolId_isActive_idx` ON `Student`(`schoolId`, `isActive`);

-- CreateIndex
CREATE UNIQUE INDEX `StudentAttendance_studentId_date_timetableSlotId_key` ON `StudentAttendance`(`studentId`, `date`, `timetableSlotId`);

-- CreateIndex
CREATE UNIQUE INDEX `StudentAttendance_studentId_date_classId_academicYear_term_key` ON `StudentAttendance`(`studentId`, `date`, `classId`, `academicYear`, `term`);

-- CreateIndex
CREATE INDEX `StudentClassEnrollment_studentId_academicYear_isCurrent_idx` ON `StudentClassEnrollment`(`studentId`, `academicYear`, `isCurrent`);

-- CreateIndex
CREATE UNIQUE INDEX `TimetableSlot_schoolId_room_dayOfWeek_startTime_key` ON `TimetableSlot`(`schoolId`, `room`, `dayOfWeek`, `startTime`);

-- AddForeignKey
ALTER TABLE `Teacher` ADD CONSTRAINT `Teacher_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Student` ADD CONSTRAINT `Student_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assessment` ADD CONSTRAINT `Assessment_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assessment` ADD CONSTRAINT `Assessment_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assessment` ADD CONSTRAINT `Assessment_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `Class`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assessment` ADD CONSTRAINT `Assessment_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `Subject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Assessment` ADD CONSTRAINT `Assessment_createdByUserId_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentMark` ADD CONSTRAINT `StudentMark_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `Assessment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentMark` ADD CONSTRAINT `StudentMark_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `Student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StudentMark` ADD CONSTRAINT `StudentMark_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FeeStructure` ADD CONSTRAINT `FeeStructure_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `School`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invoice` ADD CONSTRAINT `Invoice_parentToBillId_fkey` FOREIGN KEY (`parentToBillId`) REFERENCES `Parent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
