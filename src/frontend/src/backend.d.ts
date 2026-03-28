import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Student {
    id: bigint;
    name: string;
    admissionNumber: string;
    parentId: Principal;
    studentClass: string;
}
export interface SchoolEvent {
    id: bigint;
    title: string;
    date: string;
    description: string;
    category: string;
}
export interface CBCSubject {
    id: bigint;
    name: string;
    teacher: string;
}
export interface CBCGrade {
    id: bigint;
    studentId: bigint;
    term: bigint;
    year: bigint;
    level: string;
    score: bigint;
    subjectId: bigint;
    teacherId: bigint;
    remarks: string;
}
export interface FeePayment {
    id: bigint;
    studentId: bigint;
    date: string;
    term: bigint;
    year: bigint;
    amount: bigint;
    receiptNumber: string;
}
export interface Announcement {
    id: bigint;
    title: string;
    content: string;
    date: string;
    targetRole: string;
}
export interface UserProfile {
    schoolRole: SchoolRole;
    name: string;
    email: string;
    phone: string;
}
export interface FeeStructure {
    id: bigint;
    item: string;
    term: bigint;
    year: bigint;
    amount: bigint;
}
export interface RegistrationRequest {
    id: bigint;
    callerPrincipal: Principal;
    name: string;
    admissionNumber: string;
    studentClass: string;
    requestDate: string;
    status: string;
}
export interface ParentLinkRequest {
    id: bigint;
    callerPrincipal: Principal;
    admissionNumber: string;
    studentName: string;
    requestDate: string;
    status: string;
}
export enum SchoolRole {
    admin = "admin",
    teacher = "teacher",
    student = "student",
    parent = "parent"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createAnnouncement(title: string, content: string, date: string, targetRole: string): Promise<bigint>;
    createEvent(title: string, description: string, date: string, category: string): Promise<bigint>;
    createFeePayment(studentId: bigint, amount: bigint, date: string, receiptNumber: string, term: bigint, year: bigint): Promise<bigint>;
    createFeeStructure(item: string, amount: bigint, term: bigint, year: bigint): Promise<bigint>;
    createGrade(studentId: bigint, subjectId: bigint, term: bigint, year: bigint, level: string, score: bigint, remarks: string, teacherId: bigint): Promise<bigint>;
    createStudent(name: string, admissionNumber: string, studentClass: string, parentId: Principal): Promise<bigint>;
    createSubject(name: string, teacher: string): Promise<bigint>;
    deleteAnnouncement(id: bigint): Promise<void>;
    deleteEvent(id: bigint): Promise<void>;
    deleteFeePayment(id: bigint): Promise<void>;
    deleteFeeStructure(id: bigint): Promise<void>;
    deleteGrade(id: bigint): Promise<void>;
    deleteStudent(id: bigint): Promise<void>;
    deleteSubject(id: bigint): Promise<void>;
    getAllAnnouncements(): Promise<Array<Announcement>>;
    getAllEvents(): Promise<Array<SchoolEvent>>;
    getAllFeePayments(): Promise<Array<FeePayment>>;
    getAllFeeStructures(): Promise<Array<FeeStructure>>;
    getAllGrades(): Promise<Array<CBCGrade>>;
    getAllStudents(): Promise<Array<Student>>;
    getAllSubjects(): Promise<Array<CBCSubject>>;
    getAnnouncement(announcementId: bigint): Promise<Announcement>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getEvent(eventId: bigint): Promise<SchoolEvent>;
    getFeeBalanceForStudent(studentId: bigint, term: bigint, year: bigint): Promise<bigint>;
    getFeePayment(feePaymentId: bigint): Promise<FeePayment>;
    getFeeStructure(feeStructureId: bigint): Promise<FeeStructure>;
    getGrade(gradeId: bigint): Promise<CBCGrade>;
    getGradesByStudent(studentId: bigint): Promise<Array<CBCGrade>>;
    getStudent(studentId: bigint): Promise<Student>;
    getSubject(subjectId: bigint): Promise<CBCSubject>;
    getUpcomingEvents(): Promise<Array<SchoolEvent>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    seedSampleData(): Promise<void>;
    updateAnnouncement(id: bigint, title: string, content: string, date: string, targetRole: string): Promise<void>;
    updateEvent(id: bigint, title: string, description: string, date: string, category: string): Promise<void>;
    updateFeePayment(id: bigint, studentId: bigint, amount: bigint, date: string, receiptNumber: string, term: bigint, year: bigint): Promise<void>;
    updateFeeStructure(id: bigint, item: string, amount: bigint, term: bigint, year: bigint): Promise<void>;
    updateGrade(id: bigint, studentId: bigint, subjectId: bigint, term: bigint, year: bigint, level: string, score: bigint, remarks: string, teacherId: bigint): Promise<void>;
    updateStudent(id: bigint, name: string, admissionNumber: string, studentClass: string, parentId: Principal): Promise<void>;
    updateSubject(id: bigint, name: string, teacher: string): Promise<void>;
    getStudentsByParent(): Promise<Array<Student>>;
    getFeePaymentsByStudent(studentId: bigint): Promise<Array<FeePayment>>;
    getAdminCount(): Promise<bigint>;
    grantAdminRole(target: Principal): Promise<void>;
    getMyStudentRecord(): Promise<Student | null>;
    submitStudentRegistration(name: string, admissionNumber: string, studentClass: string, requestDate: string): Promise<bigint>;
    getAllRegistrationRequests(): Promise<Array<RegistrationRequest>>;
    approveStudentRegistration(requestId: bigint, parentId: Principal): Promise<bigint>;
    rejectStudentRegistration(requestId: bigint): Promise<void>;
    submitParentLinkRequest(admissionNumber: string, studentName: string, requestDate: string): Promise<bigint>;
    getAllParentLinkRequests(): Promise<Array<ParentLinkRequest>>;
    approveParentLinkRequest(requestId: bigint): Promise<void>;
    rejectParentLinkRequest(requestId: bigint): Promise<void>;
}
