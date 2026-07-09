export type AttendanceSubject = {
  subject: string;
  attended: number;
  total: number;
  percentage: number;
};

export type AttendanceResult = {
  student: string;
  semester: string;
  subjects: AttendanceSubject[];
  source: {
    portal: string;
    extractedAt: string;
  };
};

export type PortalCredentials = {
  username: string;
  password: string;
};
