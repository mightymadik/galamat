/** Данные документа из check-doc или биометрики (для профиля и оформления). */
export interface DocData {
  lastName: string;
  firstName: string;
  middleName: string;
  gender: string;
  dateOfBirth: string;
  docNumber: string;
  docIssuer: string;
  dateOfIssue: string;
  phone: string;
  iin?: string;
  email?: string;
  address?: string;
}
