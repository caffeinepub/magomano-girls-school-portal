import Map "mo:core/Map";
import List "mo:core/List";
import Array "mo:core/Array";
import Nat "mo:core/Nat";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Text "mo:core/Text";
import AcadOrder "mo:core/Order";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import Int "mo:core/Int";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  public type UserRole = AccessControl.UserRole;

  public type SchoolRole = {
    #admin;
    #teacher;
    #parent;
    #student;
  };

  public type UserProfile = {
    name : Text;
    schoolRole : SchoolRole;
    phone : Text;
    email : Text;
  };

  // Student type kept identical to previous version (no new fields)
  public type Student = {
    id : Nat;
    name : Text;
    admissionNumber : Text;
    studentClass : Text;
    parentId : Principal;
  };

  public type CBCSubject = {
    id : Nat;
    name : Text;
    teacher : Text;
  };

  public type CBCGrade = {
    id : Nat;
    studentId : Nat;
    subjectId : Nat;
    term : Nat;
    year : Nat;
    level : Text;
    score : Nat;
    remarks : Text;
    teacherId : Nat;
  };

  public type FeeStructure = {
    id : Nat;
    item : Text;
    amount : Nat;
    term : Nat;
    year : Nat;
  };

  public type FeePayment = {
    id : Nat;
    studentId : Nat;
    amount : Nat;
    date : Text;
    receiptNumber : Text;
    term : Nat;
    year : Nat;
  };

  public type SchoolEvent = {
    id : Nat;
    title : Text;
    description : Text;
    date : Text;
    category : Text;
  };

  public type Announcement = {
    id : Nat;
    title : Text;
    content : Text;
    date : Text;
    targetRole : Text;
  };

  public type RegistrationRequest = {
    id : Nat;
    callerPrincipal : Principal;
    name : Text;
    admissionNumber : Text;
    studentClass : Text;
    requestDate : Text;
    status : Text;
  };

  public type ParentLinkRequest = {
    id : Nat;
    callerPrincipal : Principal;
    admissionNumber : Text;
    studentName : Text;
    requestDate : Text;
    status : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();
  let students = Map.empty<Nat, Student>();
  let cbcSubjects = Map.empty<Nat, CBCSubject>();
  let cbcGrades = Map.empty<Nat, CBCGrade>();
  let feeStructures = Map.empty<Nat, FeeStructure>();
  let feePayments = Map.empty<Nat, FeePayment>();
  let schoolEvents = Map.empty<Nat, SchoolEvent>();
  let announcements = Map.empty<Nat, Announcement>();
  let registrationRequests = Map.empty<Nat, RegistrationRequest>();
  let parentLinkRequests = Map.empty<Nat, ParentLinkRequest>();
  // Maps student ID -> student's own Principal (for self-login)
  let studentPrincipals = Map.empty<Nat, Principal>();

  var nextStudentId = 1;
  var nextSubjectId = 1;
  var nextGradeId = 1;
  var nextFeeStructureId = 1;
  var nextFeePaymentId = 1;
  var nextEventId = 1;
  var nextAnnouncementId = 1;
  var nextRegistrationRequestId = 1;
  var nextParentLinkRequestId = 1;

  func isAdminOrTeacher(caller : Principal) : Bool {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return true;
    };
    // Also check the user's school role in their profile
    switch (userProfiles.get(caller)) {
      case (?profile) {
        switch (profile.schoolRole) {
          case (#teacher) { true };
          case (#admin) { true };
          case (_) { false };
        };
      };
      case (null) { false };
    };
  };

  func canAccessStudentData(caller : Principal, studentId : Nat) : Bool {
    if (isAdminOrTeacher(caller)) {
      return true;
    };
    switch (students.get(studentId)) {
      case (?student) {
        if (student.parentId == caller) {
          return true;
        };
        // Check if caller is the student themselves
        switch (studentPrincipals.get(studentId)) {
          case (?pid) { pid == caller };
          case (null) { false };
        };
      };
      case (null) { false };
    };
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    // Auto-register user in access control if not already registered
    switch (AccessControl.getUserRole(accessControlState, caller)) {
      case (#guest) {
        accessControlState.userRoles.add(caller, #user);
      };
      case (_) {};
    };
    userProfiles.add(caller, profile);
  };

  // Student CRUD
  public shared ({ caller }) func createStudent(name : Text, admissionNumber : Text, studentClass : Text, parentId : Principal) : async Nat {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can create students");
    };
    let id = nextStudentId;
    nextStudentId += 1;
    let student : Student = {
      id = id;
      name = name;
      admissionNumber = admissionNumber;
      studentClass = studentClass;
      parentId = parentId;
    };
    students.add(id, student);
    id
  };

  public shared ({ caller }) func updateStudent(id : Nat, name : Text, admissionNumber : Text, studentClass : Text, parentId : Principal) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can update students");
    };
    let student : Student = {
      id = id;
      name = name;
      admissionNumber = admissionNumber;
      studentClass = studentClass;
      parentId = parentId;
    };
    students.add(id, student);
  };

  public shared ({ caller }) func deleteStudent(id : Nat) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can delete students");
    };
    students.remove(id);
    studentPrincipals.remove(id);
  };

  public query ({ caller }) func getStudent(studentId : Nat) : async Student {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    if (not canAccessStudentData(caller, studentId)) {
      Runtime.trap("Unauthorized: Cannot access this student's data");
    };
    switch (students.get(studentId)) {
      case (null) { Runtime.trap("Student not found") };
      case (?student) { student };
    };
  };

  public query ({ caller }) func getAllStudents() : async [Student] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can view all students");
    };
    students.values().toArray();
  };

  // Subject CRUD
  public shared ({ caller }) func createSubject(name : Text, teacher : Text) : async Nat {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can create subjects");
    };
    let id = nextSubjectId;
    nextSubjectId += 1;
    let subject : CBCSubject = {
      id = id;
      name = name;
      teacher = teacher;
    };
    cbcSubjects.add(id, subject);
    id
  };

  public shared ({ caller }) func updateSubject(id : Nat, name : Text, teacher : Text) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can update subjects");
    };
    let subject : CBCSubject = {
      id = id;
      name = name;
      teacher = teacher;
    };
    cbcSubjects.add(id, subject);
  };

  public shared ({ caller }) func deleteSubject(id : Nat) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can delete subjects");
    };
    cbcSubjects.remove(id);
  };

  public query ({ caller }) func getSubject(subjectId : Nat) : async CBCSubject {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    switch (cbcSubjects.get(subjectId)) {
      case (null) { Runtime.trap("Subject not found") };
      case (?subject) { subject };
    };
  };

  public query ({ caller }) func getAllSubjects() : async [CBCSubject] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    cbcSubjects.values().toArray();
  };

  // Grade CRUD
  public shared ({ caller }) func createGrade(studentId : Nat, subjectId : Nat, term : Nat, year : Nat, level : Text, score : Nat, remarks : Text, teacherId : Nat) : async Nat {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can create grades");
    };
    let id = nextGradeId;
    nextGradeId += 1;
    let grade : CBCGrade = {
      id = id;
      studentId = studentId;
      subjectId = subjectId;
      term = term;
      year = year;
      level = level;
      score = score;
      remarks = remarks;
      teacherId = teacherId;
    };
    cbcGrades.add(id, grade);
    id
  };

  public shared ({ caller }) func updateGrade(id : Nat, studentId : Nat, subjectId : Nat, term : Nat, year : Nat, level : Text, score : Nat, remarks : Text, teacherId : Nat) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can update grades");
    };
    let grade : CBCGrade = {
      id = id;
      studentId = studentId;
      subjectId = subjectId;
      term = term;
      year = year;
      level = level;
      score = score;
      remarks = remarks;
      teacherId = teacherId;
    };
    cbcGrades.add(id, grade);
  };

  public shared ({ caller }) func deleteGrade(id : Nat) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can delete grades");
    };
    cbcGrades.remove(id);
  };

  public query ({ caller }) func getGrade(gradeId : Nat) : async CBCGrade {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    switch (cbcGrades.get(gradeId)) {
      case (null) { Runtime.trap("Grade not found") };
      case (?grade) {
        if (not canAccessStudentData(caller, grade.studentId)) {
          Runtime.trap("Unauthorized: Cannot access this grade data");
        };
        grade
      };
    };
  };

  public query ({ caller }) func getGradesByStudent(studentId : Nat) : async [CBCGrade] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    if (not canAccessStudentData(caller, studentId)) {
      Runtime.trap("Unauthorized: Cannot access this student's grades");
    };
    cbcGrades.values().toArray().filter<CBCGrade>(func(g) { g.studentId == studentId });
  };

  public query ({ caller }) func getAllGrades() : async [CBCGrade] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can view all grades");
    };
    cbcGrades.values().toArray();
  };

  // Fee Structure CRUD
  public shared ({ caller }) func createFeeStructure(item : Text, amount : Nat, term : Nat, year : Nat) : async Nat {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can create fee structures");
    };
    let id = nextFeeStructureId;
    nextFeeStructureId += 1;
    let feeStructure : FeeStructure = {
      id = id;
      item = item;
      amount = amount;
      term = term;
      year = year;
    };
    feeStructures.add(id, feeStructure);
    id
  };

  public shared ({ caller }) func updateFeeStructure(id : Nat, item : Text, amount : Nat, term : Nat, year : Nat) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can update fee structures");
    };
    let feeStructure : FeeStructure = {
      id = id;
      item = item;
      amount = amount;
      term = term;
      year = year;
    };
    feeStructures.add(id, feeStructure);
  };

  public shared ({ caller }) func deleteFeeStructure(id : Nat) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can delete fee structures");
    };
    feeStructures.remove(id);
  };

  public query ({ caller }) func getFeeStructure(feeStructureId : Nat) : async FeeStructure {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    switch (feeStructures.get(feeStructureId)) {
      case (null) { Runtime.trap("Fee structure not found") };
      case (?feeStructure) { feeStructure };
    };
  };

  public query ({ caller }) func getAllFeeStructures() : async [FeeStructure] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    feeStructures.values().toArray();
  };

  // Fee Payment CRUD
  public shared ({ caller }) func createFeePayment(studentId : Nat, amount : Nat, date : Text, receiptNumber : Text, term : Nat, year : Nat) : async Nat {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can create fee payments");
    };
    let id = nextFeePaymentId;
    nextFeePaymentId += 1;
    let feePayment : FeePayment = {
      id = id;
      studentId = studentId;
      amount = amount;
      date = date;
      receiptNumber = receiptNumber;
      term = term;
      year = year;
    };
    feePayments.add(id, feePayment);
    id
  };

  public shared ({ caller }) func updateFeePayment(id : Nat, studentId : Nat, amount : Nat, date : Text, receiptNumber : Text, term : Nat, year : Nat) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can update fee payments");
    };
    let feePayment : FeePayment = {
      id = id;
      studentId = studentId;
      amount = amount;
      date = date;
      receiptNumber = receiptNumber;
      term = term;
      year = year;
    };
    feePayments.add(id, feePayment);
  };

  public shared ({ caller }) func deleteFeePayment(id : Nat) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can delete fee payments");
    };
    feePayments.remove(id);
  };

  public query ({ caller }) func getFeePayment(feePaymentId : Nat) : async FeePayment {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    switch (feePayments.get(feePaymentId)) {
      case (null) { Runtime.trap("Fee payment not found") };
      case (?feePayment) {
        if (not canAccessStudentData(caller, feePayment.studentId)) {
          Runtime.trap("Unauthorized: Cannot access this payment data");
        };
        feePayment
      };
    };
  };

  public query ({ caller }) func getFeeBalanceForStudent(studentId : Nat, term : Nat, year : Nat) : async Int {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    if (not canAccessStudentData(caller, studentId)) {
      Runtime.trap("Unauthorized: Cannot access this student's fee data");
    };
    
    var totalFees : Nat = 0;
    for (fee in feeStructures.values()) {
      if (fee.term == term and fee.year == year) {
        totalFees += fee.amount;
      };
    };
    
    var totalPaid : Nat = 0;
    for (payment in feePayments.values()) {
      if (payment.studentId == studentId and payment.term == term and payment.year == year) {
        totalPaid += payment.amount;
      };
    };
    
    totalFees - totalPaid;
  };

  public query ({ caller }) func getAllFeePayments() : async [FeePayment] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can view all fee payments");
    };
    feePayments.values().toArray();
  };

  // Event CRUD
  public shared ({ caller }) func createEvent(title : Text, description : Text, date : Text, category : Text) : async Nat {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can create events");
    };
    let id = nextEventId;
    nextEventId += 1;
    let event : SchoolEvent = {
      id = id;
      title = title;
      description = description;
      date = date;
      category = category;
    };
    schoolEvents.add(id, event);
    id
  };

  public shared ({ caller }) func updateEvent(id : Nat, title : Text, description : Text, date : Text, category : Text) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can update events");
    };
    let event : SchoolEvent = {
      id = id;
      title = title;
      description = description;
      date = date;
      category = category;
    };
    schoolEvents.add(id, event);
  };

  public shared ({ caller }) func deleteEvent(id : Nat) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can delete events");
    };
    schoolEvents.remove(id);
  };

  public query ({ caller }) func getEvent(eventId : Nat) : async SchoolEvent {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    switch (schoolEvents.get(eventId)) {
      case (null) { Runtime.trap("Event not found") };
      case (?event) { event };
    };
  };

  public query ({ caller }) func getAllEvents() : async [SchoolEvent] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    schoolEvents.values().toArray();
  };

  public query ({ caller }) func getUpcomingEvents() : async [SchoolEvent] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    schoolEvents.values().toArray();
  };

  // Announcement CRUD
  public shared ({ caller }) func createAnnouncement(title : Text, content : Text, date : Text, targetRole : Text) : async Nat {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can create announcements");
    };
    let id = nextAnnouncementId;
    nextAnnouncementId += 1;
    let announcement : Announcement = {
      id = id;
      title = title;
      content = content;
      date = date;
      targetRole = targetRole;
    };
    announcements.add(id, announcement);
    id
  };

  public shared ({ caller }) func updateAnnouncement(id : Nat, title : Text, content : Text, date : Text, targetRole : Text) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can update announcements");
    };
    let announcement : Announcement = {
      id = id;
      title = title;
      content = content;
      date = date;
      targetRole = targetRole;
    };
    announcements.add(id, announcement);
  };

  public shared ({ caller }) func deleteAnnouncement(id : Nat) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can delete announcements");
    };
    announcements.remove(id);
  };

  public query ({ caller }) func getAnnouncement(announcementId : Nat) : async Announcement {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    switch (announcements.get(announcementId)) {
      case (null) { Runtime.trap("Announcement not found") };
      case (?announcement) { announcement };
    };
  };

  public query ({ caller }) func getAllAnnouncements() : async [Announcement] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    announcements.values().toArray();
  };

  // Get all students linked to the calling parent
  public query ({ caller }) func getStudentsByParent() : async [Student] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    students.values().toArray().filter<Student>(func(s) { s.parentId == caller });
  };

  // Get student record for the logged-in student (matched via studentPrincipals map)
  public query ({ caller }) func getMyStudentRecord() : async ?Student {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    var found : ?Student = null;
    for ((studentId, pid) in studentPrincipals.entries()) {
      if (pid == caller) {
        found := students.get(studentId);
      };
    };
    found
  };

  // Get fee payments for a specific student
  public query ({ caller }) func getFeePaymentsByStudent(studentId : Nat) : async [FeePayment] {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    if (not canAccessStudentData(caller, studentId)) {
      Runtime.trap("Unauthorized: Cannot access this student's payment data");
    };
    feePayments.values().toArray().filter<FeePayment>(func(p) { p.studentId == studentId });
  };

  // ---- Student Self-Registration Requests ----

  public shared ({ caller }) func submitStudentRegistration(name : Text, admissionNumber : Text, studentClass : Text, requestDate : Text) : async Nat {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in to submit enrollment");
    };
    let id = nextRegistrationRequestId;
    nextRegistrationRequestId += 1;
    let req : RegistrationRequest = {
      id = id;
      callerPrincipal = caller;
      name = name;
      admissionNumber = admissionNumber;
      studentClass = studentClass;
      requestDate = requestDate;
      status = "pending";
    };
    registrationRequests.add(id, req);
    id
  };

  public query ({ caller }) func getAllRegistrationRequests() : async [RegistrationRequest] {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can view registration requests");
    };
    registrationRequests.values().toArray();
  };

  // Admin approves student registration: creates student record + links principal
  public shared ({ caller }) func approveStudentRegistration(requestId : Nat, parentId : Principal) : async Nat {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins can approve registrations");
    };
    switch (registrationRequests.get(requestId)) {
      case (null) { Runtime.trap("Registration request not found") };
      case (?req) {
        let studentId = nextStudentId;
        nextStudentId += 1;
        let student : Student = {
          id = studentId;
          name = req.name;
          admissionNumber = req.admissionNumber;
          studentClass = req.studentClass;
          parentId = parentId;
        };
        students.add(studentId, student);
        // Link the student's own principal
        studentPrincipals.add(studentId, req.callerPrincipal);
        let updatedReq : RegistrationRequest = {
          id = req.id;
          callerPrincipal = req.callerPrincipal;
          name = req.name;
          admissionNumber = req.admissionNumber;
          studentClass = req.studentClass;
          requestDate = req.requestDate;
          status = "approved";
        };
        registrationRequests.add(requestId, updatedReq);
        studentId
      };
    };
  };

  public shared ({ caller }) func rejectStudentRegistration(requestId : Nat) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins can reject registrations");
    };
    switch (registrationRequests.get(requestId)) {
      case (null) { Runtime.trap("Registration request not found") };
      case (?req) {
        let updatedReq : RegistrationRequest = {
          id = req.id;
          callerPrincipal = req.callerPrincipal;
          name = req.name;
          admissionNumber = req.admissionNumber;
          studentClass = req.studentClass;
          requestDate = req.requestDate;
          status = "rejected";
        };
        registrationRequests.add(requestId, updatedReq);
      };
    };
  };

  // Get the calling student's own registration request (if any)
  public query ({ caller }) func getMyRegistrationRequest() : async ?RegistrationRequest {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in");
    };
    var found : ?RegistrationRequest = null;
    for ((_, req) in registrationRequests.entries()) {
      if (req.callerPrincipal == caller) {
        found := ?req;
      };
    };
    found
  };

  // Admin links a Principal ID to an existing student record
  public shared ({ caller }) func linkStudentPrincipal(studentId : Nat, studentPrincipal : Principal) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins can link principals");
    };
    switch (students.get(studentId)) {
      case (null) { Runtime.trap("Student not found") };
      case (?_) { studentPrincipals.add(studentId, studentPrincipal) };
    };
  };

  // ---- Parent Link Requests ----

  public shared ({ caller }) func submitParentLinkRequest(admissionNumber : Text, studentName : Text, requestDate : Text) : async Nat {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Authentication required");
    };
    let id = nextParentLinkRequestId;
    nextParentLinkRequestId += 1;
    let req : ParentLinkRequest = {
      id = id;
      callerPrincipal = caller;
      admissionNumber = admissionNumber;
      studentName = studentName;
      requestDate = requestDate;
      status = "pending";
    };
    parentLinkRequests.add(id, req);
    id
  };

  public query ({ caller }) func getAllParentLinkRequests() : async [ParentLinkRequest] {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins and teachers can view parent link requests");
    };
    parentLinkRequests.values().toArray();
  };

  // Admin approves parent link: updates student's parentId
  public shared ({ caller }) func approveParentLinkRequest(requestId : Nat) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins can approve parent link requests");
    };
    switch (parentLinkRequests.get(requestId)) {
      case (null) { Runtime.trap("Parent link request not found") };
      case (?req) {
        var foundStudent : ?Student = null;
        for (student in students.values()) {
          if (student.admissionNumber == req.admissionNumber) {
            foundStudent := ?student;
          };
        };
        switch (foundStudent) {
          case (null) { Runtime.trap("Student with that admission number not found") };
          case (?student) {
            let updatedStudent : Student = {
              id = student.id;
              name = student.name;
              admissionNumber = student.admissionNumber;
              studentClass = student.studentClass;
              parentId = req.callerPrincipal;
            };
            students.add(student.id, updatedStudent);
            let updatedReq : ParentLinkRequest = {
              id = req.id;
              callerPrincipal = req.callerPrincipal;
              admissionNumber = req.admissionNumber;
              studentName = req.studentName;
              requestDate = req.requestDate;
              status = "approved";
            };
            parentLinkRequests.add(requestId, updatedReq);
          };
        };
      };
    };
  };

  public shared ({ caller }) func rejectParentLinkRequest(requestId : Nat) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins can reject parent link requests");
    };
    switch (parentLinkRequests.get(requestId)) {
      case (null) { Runtime.trap("Parent link request not found") };
      case (?req) {
        let updatedReq : ParentLinkRequest = {
          id = req.id;
          callerPrincipal = req.callerPrincipal;
          admissionNumber = req.admissionNumber;
          studentName = req.studentName;
          requestDate = req.requestDate;
          status = "rejected";
        };
        parentLinkRequests.add(requestId, updatedReq);
      };
    };
  };

  // Count how many admins currently exist
  func countAdmins() : Nat {
    var count = 0;
    for (role in accessControlState.userRoles.values()) {
      switch (role) {
        case (#admin) { count += 1 };
        case (_) {};
      };
    };
    count
  };

  public query func getAdminCount() : async Nat {
    countAdmins()
  };

  public shared ({ caller }) func grantAdminRole(target : Principal) : async () {
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins can grant admin roles");
    };
    if (countAdmins() >= 3) {
      Runtime.trap("Maximum of 3 admins allowed");
    };
    AccessControl.assignRole(accessControlState, caller, target, #admin);
  };

  public shared ({ caller }) func seedSampleData() : async () {
    if (caller.isAnonymous()) {
      Runtime.trap("Unauthorized: Must be logged in");
    };
    // Allow admins (via AccessControl or profile schoolRole) to seed data
    if (not isAdminOrTeacher(caller)) {
      Runtime.trap("Unauthorized: Only admins can seed data");
    };
    
    let parent1 = Principal.fromText("aaaaa-aa");
    students.add(1, { id = 1; name = "Jane Doe"; admissionNumber = "MGH001"; studentClass = "Form 1"; parentId = parent1 });
    students.add(2, { id = 2; name = "Mary Smith"; admissionNumber = "MGH002"; studentClass = "Form 2"; parentId = parent1 });
    students.add(3, { id = 3; name = "Grace Johnson"; admissionNumber = "MGH003"; studentClass = "Form 3"; parentId = parent1 });
    nextStudentId := 4;
    
    cbcSubjects.add(1, { id = 1; name = "Mathematics"; teacher = "Mr. Kamau" });
    cbcSubjects.add(2, { id = 2; name = "English"; teacher = "Mrs. Wanjiru" });
    cbcSubjects.add(3, { id = 3; name = "Kiswahili"; teacher = "Mr. Omondi" });
    nextSubjectId := 4;
    
    cbcGrades.add(1, { id = 1; studentId = 1; subjectId = 1; term = 1; year = 2024; level = "Meeting"; score = 75; remarks = "Good progress"; teacherId = 1 });
    cbcGrades.add(2, { id = 2; studentId = 1; subjectId = 2; term = 1; year = 2024; level = "Exceeding"; score = 85; remarks = "Excellent work"; teacherId = 2 });
    cbcGrades.add(3, { id = 3; studentId = 2; subjectId = 1; term = 1; year = 2024; level = "Approaching"; score = 65; remarks = "Needs improvement"; teacherId = 1 });
    nextGradeId := 4;
    
    feeStructures.add(1, { id = 1; item = "Tuition"; amount = 15000; term = 1; year = 2024 });
    feeStructures.add(2, { id = 2; item = "Books"; amount = 3000; term = 1; year = 2024 });
    feeStructures.add(3, { id = 3; item = "Uniform"; amount = 5000; term = 1; year = 2024 });
    nextFeeStructureId := 4;
    
    feePayments.add(1, { id = 1; studentId = 1; amount = 15000; date = "2024-01-15"; receiptNumber = "RCP001"; term = 1; year = 2024 });
    feePayments.add(2, { id = 2; studentId = 2; amount = 10000; date = "2024-01-20"; receiptNumber = "RCP002"; term = 1; year = 2024 });
    nextFeePaymentId := 3;
    
    schoolEvents.add(1, { id = 1; title = "Sports Day"; description = "Annual sports competition"; date = "2024-03-15"; category = "sports" });
    schoolEvents.add(2, { id = 2; title = "Science Fair"; description = "Student science projects exhibition"; date = "2024-04-20"; category = "academic" });
    schoolEvents.add(3, { id = 3; title = "Cultural Day"; description = "Celebration of diverse cultures"; date = "2024-05-10"; category = "cultural" });
    nextEventId := 4;
    
    announcements.add(1, { id = 1; title = "Term Opening"; content = "School reopens on January 8th"; date = "2024-01-01"; targetRole = "all" });
    announcements.add(2, { id = 2; title = "Parent Meeting"; content = "Parent-teacher meeting on February 15th"; date = "2024-02-01"; targetRole = "parents" });
    announcements.add(3, { id = 3; title = "Exam Schedule"; content = "End of term exams start March 1st"; date = "2024-02-20"; targetRole = "students" });
    nextAnnouncementId := 4;
  };
};
